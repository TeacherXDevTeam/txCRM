-- =====================================================================
-- Kurum Eğitim Takip — kesit tabloları
-- PLAN_KURUM_TAKIP_PANOSU.md §1.1
--
-- Canlıya Supabase SQL Editor'den uygulanır; bu dosya repo kaydıdır.
-- Additive ve idempotent — mevcut tablolara dokunmaz.
--
-- İLKE: burada saklanan şey girdinin kendisi değil, ÜRETİLEN ÇIKTIDIR.
-- Ad, soyad, e-posta ve kişi bazlı ilerleme hiçbir kolonda yer almaz.
-- =====================================================================

-- Bir Excel yüklemesi = bir KESİT ------------------------------------
create table if not exists report_kesit (
  id            uuid primary key default gen_random_uuid(),
  kesit_tarihi  date        not null,
  dosya_adi     text,
  kaynak_satir  integer     not null default 0,   -- denetim izi: dosyada kaç satır vardı
  yukleyen      uuid        references team_members(id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (kesit_tarihi)                            -- gün başına tek kesit
);

-- KESİT × KURUM — panonun ana tablosu --------------------------------
create table if not exists report_kurum (
  id                  uuid primary key default gen_random_uuid(),
  kesit_id            uuid not null references report_kesit(id) on delete cascade,
  kurum_adi           text not null,                     -- rapordaki ad; kaynak veri
  school_id           uuid references schools(id) on delete set null,  -- eşleşince dolar

  kaynak              text not null default 'detayli'
                      check (kaynak in ('detayli','ozet')),

  ogretmen_sayisi     integer not null default 0,
  sube_sayisi         integer not null default 0,
  egitim_sayisi       integer,          -- NULL = özet dökümde bilinmiyor
  kayit_sayisi        integer not null default 0,

  ilerleme_ortalamasi numeric(5,2) not null default 0,    -- %; kısmi ilerleme SAYILIR
  tamamlanma_orani    numeric(5,2) not null default 0,    -- %; kısmi SAYILMAZ
  tamamlanan_egitim   integer not null default 0,

  sertifika_sayisi    integer,          -- NULL = bilinmiyor ("0 sertifika" ile aynı şey değil)
  sertifika_alan      integer,

  hic_baslamayan      integer not null default 0,
  devam_eden          integer not null default 0,
  tumunu_tamamlayan   integer not null default 0,
  esitsiz_atama       integer not null default 0,

  created_at          timestamptz not null default now(),
  unique (kesit_id, kurum_adi)
);
create index if not exists report_kurum_kesit_idx  on report_kurum (kesit_id);
create index if not exists report_kurum_school_idx on report_kurum (school_id);
create index if not exists report_kurum_ad_idx     on report_kurum (kurum_adi);

-- KESİT × KURUM × ŞUBE -----------------------------------------------
create table if not exists report_sube (
  id                  uuid primary key default gen_random_uuid(),
  kurum_id            uuid not null references report_kurum(id) on delete cascade,
  sube_adi            text not null,
  ogretmen_sayisi     integer not null default 0,
  egitim_sayisi       integer,
  ilerleme_ortalamasi numeric(5,2) not null default 0,
  tamamlanma_orani    numeric(5,2) not null default 0,
  sertifika_sayisi    integer,
  hic_baslamayan      integer not null default 0,
  devam_eden          integer not null default 0,
  tumunu_tamamlayan   integer not null default 0,
  unique (kurum_id, sube_adi)
);
create index if not exists report_sube_kurum_idx on report_sube (kurum_id);

-- KESİT × KURUM × EĞİTİM ---------------------------------------------
create table if not exists report_egitim (
  id               uuid primary key default gen_random_uuid(),
  kurum_id         uuid not null references report_kurum(id) on delete cascade,
  egitim_adi       text not null,
  atanan_ogretmen  integer not null default 0,
  tamamlayan       integer not null default 0,
  tamamlanma_orani numeric(5,2) not null default 0,
  hic_baslamayan   integer not null default 0,
  sertifika_sayisi integer not null default 0,
  unique (kurum_id, egitim_adi)
);
create index if not exists report_egitim_kurum_idx on report_egitim (kurum_id);

-- Kümülatif sertifika eğrisi — aylık histogram, kişisel veri yok -----
create table if not exists report_sertifika_ay (
  id       uuid primary key default gen_random_uuid(),
  kurum_id uuid not null references report_kurum(id) on delete cascade,
  ay       date not null,          -- ayın 1'i
  adet     integer not null default 0,
  unique (kurum_id, ay)
);
create index if not exists report_sertifika_ay_kurum_idx on report_sertifika_ay (kurum_id);

-- RLS: admin + operasyon (mevcut desen) -------------------------------
alter table report_kesit        enable row level security;
alter table report_kurum        enable row level security;
alter table report_sube         enable row level security;
alter table report_egitim       enable row level security;
alter table report_sertifika_ay enable row level security;

do $$
declare t text;
begin
  foreach t in array array['report_kesit','report_kurum','report_sube',
                           'report_egitim','report_sertifika_ay']
  loop
    execute format('drop policy if exists %I_rw on %I', t, t);
    execute format($f$
      create policy %I_rw on %I for all
      using ( get_my_role() = 'admin'
              or (select department from team_members where id = auth.uid()) = 'operasyon' )
      with check ( get_my_role() = 'admin'
              or (select department from team_members where id = auth.uid()) = 'operasyon' )
    $f$, t || '_rw', t);
  end loop;
end $$;

comment on table report_kesit is
  'Bir Excel yüklemesinin kesiti. Ham satırlar SAKLANMAZ; yalnızca kurum/şube/eğitim düzeyindeki sayılar tutulur.';
comment on column report_kurum.kurum_adi is
  'Rapordaki serbest metin kurum adı — kaynak veri. school_id eşleşince dolar, eşleşmezse NULL kalır ve kayıt yine de tutulur.';
comment on column report_kurum.egitim_sayisi is
  'NULL = özet dökümde bilinmiyor. Sıfır ile karıştırılmamalı.';
