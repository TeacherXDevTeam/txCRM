// Bu dosya `npx supabase gen types typescript --local > types/database.ts`
// komutuyla otomatik üretilir. Supabase bağlandığında üzerine yazılacak.
// Şimdilik placeholder — tip güvenliği Supabase kurulumundan sonra aktif olur.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      team_members: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          avatar_url: string | null;
          role: "admin" | "member" | "viewer";
          department: "satis" | "operasyon" | "icerik" | "egitim" | null;
          is_active: boolean;
          last_login: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          avatar_url?: string | null;
          role?: "admin" | "member" | "viewer";
          department?: "satis" | "operasyon" | "icerik" | "egitim" | null;
          is_active?: boolean;
          last_login?: string | null;
        };
        Relationships: [];
        Update: {
          email?: string;
          full_name?: string;
          avatar_url?: string | null;
          role?: "admin" | "member" | "viewer";
          department?: "satis" | "operasyon" | "icerik" | "egitim" | null;
          is_active?: boolean;
          last_login?: string | null;
        };
      };
      contacts: {
        Row: {
          id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          title: string | null;
          organization: string | null;
          contact_type: "okul_koordinatoru" | "egitmen" | "partner" | "potansiyel" | "diger";
          notes: string | null;
          linked_school_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          full_name: string;
          email?: string | null;
          phone?: string | null;
          title?: string | null;
          organization?: string | null;
          contact_type?: "okul_koordinatoru" | "egitmen" | "partner" | "potansiyel" | "diger";
          notes?: string | null;
          linked_school_id?: string | null;
        };
        Relationships: [];
        Update: {
          full_name?: string;
          email?: string | null;
          phone?: string | null;
          title?: string | null;
          organization?: string | null;
          contact_type?: "okul_koordinatoru" | "egitmen" | "partner" | "potansiyel" | "diger";
          notes?: string | null;
          linked_school_id?: string | null;
        };
      };
      schools: {
        Row: {
          id: string;
          name: string;
          city: string;
          district: string | null;
          school_type: "devlet" | "ozel" | "vakif";
          status: "aktif" | "pasif" | "potansiyel";
          partnership_start_date: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          city: string;
          district?: string | null;
          school_type?: "devlet" | "ozel" | "vakif";
          status?: "aktif" | "pasif" | "potansiyel";
          partnership_start_date?: string | null;
          notes?: string | null;
        };
        Relationships: [];
        Update: {
          name?: string;
          city?: string;
          district?: string | null;
          school_type?: "devlet" | "ozel" | "vakif";
          status?: "aktif" | "pasif" | "potansiyel";
          partnership_start_date?: string | null;
          notes?: string | null;
        };
      };
      leads: {
        Row: {
          id: string;
          contact_id: string;
          school_id: string | null;
          stage: "yeni_baglanti" | "ilk_gorusme" | "ihtiyac_analizi" | "teklif_hazirlaniyor" | "teklif_verildi" | "gorusme_yapildi" | "kapandi_kazanildi" | "kapandi_kaybedildi";
          assigned_to: string | null;
          source: "referans" | "etkinlik" | "soguk_arama" | "web" | "diger";
          estimated_value: number | null;
          next_action_date: string | null;
          reminder_sent: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          contact_id: string;
          school_id?: string | null;
          stage?: "yeni_baglanti" | "ilk_gorusme" | "ihtiyac_analizi" | "teklif_hazirlaniyor" | "teklif_verildi" | "gorusme_yapildi" | "kapandi_kazanildi" | "kapandi_kaybedildi";
          assigned_to?: string | null;
          source?: "referans" | "etkinlik" | "soguk_arama" | "web" | "diger";
          estimated_value?: number | null;
          next_action_date?: string | null;
          reminder_sent?: boolean;
          notes?: string | null;
        };
        Relationships: [];
        Update: {
          contact_id?: string;
          school_id?: string | null;
          stage?: "yeni_baglanti" | "ilk_gorusme" | "ihtiyac_analizi" | "teklif_hazirlaniyor" | "teklif_verildi" | "gorusme_yapildi" | "kapandi_kazanildi" | "kapandi_kaybedildi";
          assigned_to?: string | null;
          source?: "referans" | "etkinlik" | "soguk_arama" | "web" | "diger";
          estimated_value?: number | null;
          next_action_date?: string | null;
          reminder_sent?: boolean;
          notes?: string | null;
        };
      };
      assignments: {
        Row: {
          id: string;
          school_id: string;
          training_id: string;
          trainer_id: string | null;
          assigned_to: string;
          status: "planlanmis" | "devam_ediyor" | "tamamlandi" | "iptal";
          scheduled_date: string | null;
          completed_date: string | null;
          period: string | null;
          notes: string | null;
          completion_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          school_id: string;
          training_id: string;
          trainer_id?: string | null;
          assigned_to: string;
          status?: "planlanmis" | "devam_ediyor" | "tamamlandi" | "iptal";
          scheduled_date?: string | null;
          completed_date?: string | null;
          period?: string | null;
          notes?: string | null;
          completion_notes?: string | null;
        };
        Relationships: [];
        Update: {
          school_id?: string;
          training_id?: string;
          trainer_id?: string | null;
          assigned_to?: string;
          status?: "planlanmis" | "devam_ediyor" | "tamamlandi" | "iptal";
          scheduled_date?: string | null;
          completed_date?: string | null;
          period?: string | null;
          notes?: string | null;
          completion_notes?: string | null;
        };
      };
      trainings: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          category: "yapay_zeka" | "olumlu_okul_iklimi" | "etkili_ogretmenlik" | "diger";
          format: "yuz_yuze" | "cevrimici" | "hibrit";
          duration_hours: number | null;
          status: "aktif" | "pasif" | "gelistirme";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          title: string;
          description?: string | null;
          category?: "yapay_zeka" | "olumlu_okul_iklimi" | "etkili_ogretmenlik" | "diger";
          format?: "yuz_yuze" | "cevrimici" | "hibrit";
          duration_hours?: number | null;
          status?: "aktif" | "pasif" | "gelistirme";
        };
        Relationships: [];
        Update: {
          title?: string;
          description?: string | null;
          category?: "yapay_zeka" | "olumlu_okul_iklimi" | "etkili_ogretmenlik" | "diger";
          format?: "yuz_yuze" | "cevrimici" | "hibrit";
          duration_hours?: number | null;
          status?: "aktif" | "pasif" | "gelistirme";
        };
      };
      contracts: {
        Row: {
          id: string;
          school_id: string;
          package_id: string | null;
          created_by: string;
          start_date: string;
          end_date: string;
          auto_renew: boolean;
          contract_value: number;
          payment_status: "odeme_bekleniyor" | "kismi" | "tamamlandi";
          status: "aktif" | "suresi_doldu" | "iptal";
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          school_id: string;
          package_id?: string | null;
          created_by: string;
          start_date: string;
          end_date: string;
          auto_renew?: boolean;
          contract_value: number;
          payment_status?: "odeme_bekleniyor" | "kismi" | "tamamlandi";
          status?: "aktif" | "suresi_doldu" | "iptal";
          notes?: string | null;
        };
        Relationships: [];
        Update: {
          school_id?: string;
          package_id?: string | null;
          created_by?: string;
          start_date?: string;
          end_date?: string;
          auto_renew?: boolean;
          contract_value?: number;
          payment_status?: "odeme_bekleniyor" | "kismi" | "tamamlandi";
          status?: "aktif" | "suresi_doldu" | "iptal";
          notes?: string | null;
        };
      };
      meetings: {
        Row: {
          id: string;
          title: string;
          meeting_date: string;
          meeting_type: "core_group" | "ekip" | "okul_ziyareti" | "wg_oturumu" | "diger";
          notes: string | null;
          notes_tsvector: unknown;
          related_entity_type: string | null;
          related_entity_id: string | null;
          tags: string[];
          created_by: string;
          created_at: string;
        };
        Insert: {
          title: string;
          meeting_date: string;
          meeting_type?: "core_group" | "ekip" | "okul_ziyareti" | "wg_oturumu" | "diger";
          notes?: string | null;
          related_entity_type?: string | null;
          related_entity_id?: string | null;
          tags?: string[];
          created_by: string;
        };
        Relationships: [];
        Update: {
          title?: string;
          meeting_date?: string;
          meeting_type?: "core_group" | "ekip" | "okul_ziyareti" | "wg_oturumu" | "diger";
          notes?: string | null;
          related_entity_type?: string | null;
          related_entity_id?: string | null;
          tags?: string[];
        };
      };
      todo_items: {
        Row: {
          id: string;
          meeting_id: string;
          text: string;
          assigned_to: string | null;
          due_date: string | null;
          status: "acik" | "tamamlandi";
          created_at: string;
        };
        Insert: {
          meeting_id: string;
          text: string;
          assigned_to?: string | null;
          due_date?: string | null;
          status?: "acik" | "tamamlandi";
        };
        Relationships: [];
        Update: {
          text?: string;
          assigned_to?: string | null;
          due_date?: string | null;
          status?: "acik" | "tamamlandi";
        };
      };
      working_groups: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          status: "aktif" | "tamamlandi" | "beklemede";
          start_date: string | null;
          end_date: string | null;
          current_phase: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          description?: string | null;
          status?: "aktif" | "tamamlandi" | "beklemede";
          start_date?: string | null;
          end_date?: string | null;
          current_phase?: string | null;
        };
        Relationships: [];
        Update: {
          name?: string;
          description?: string | null;
          status?: "aktif" | "tamamlandi" | "beklemede";
          start_date?: string | null;
          end_date?: string | null;
          current_phase?: string | null;
        };
      };
      trainers: {
        Row: {
          id: string;
          contact_id: string;
          expertise_areas: string[];
          status: "aktif" | "pasif";
          bio: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          contact_id: string;
          expertise_areas?: string[];
          status?: "aktif" | "pasif";
          bio?: string | null;
        };
        Relationships: [];
        Update: {
          contact_id?: string;
          expertise_areas?: string[];
          status?: "aktif" | "pasif";
          bio?: string | null;
        };
      };
      packages: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          status: "aktif" | "pasif";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          description?: string | null;
          status?: "aktif" | "pasif";
        };
        Relationships: [];
        Update: {
          name?: string;
          description?: string | null;
          status?: "aktif" | "pasif";
        };
      };
      coordinators: {
        Row: {
          id: string;
          school_id: string;
          contact_id: string;
          is_primary: boolean;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          school_id: string;
          contact_id: string;
          is_primary?: boolean;
          notes?: string | null;
        };
        Relationships: [];
        Update: {
          school_id?: string;
          contact_id?: string;
          is_primary?: boolean;
          notes?: string | null;
        };
      };
      activities: {
        Row: {
          id: string;
          school_id: string | null;
          lead_id: string | null;
          contact_id: string | null;
          created_by: string;
          activity_type: "telefon" | "eposta" | "toplanti" | "ziyaret" | "not";
          summary: string;
          details: string | null;
          activity_date: string;
          created_at: string;
        };
        Insert: {
          school_id?: string | null;
          lead_id?: string | null;
          contact_id?: string | null;
          created_by: string;
          activity_type: "telefon" | "eposta" | "toplanti" | "ziyaret" | "not";
          summary: string;
          details?: string | null;
          activity_date: string;
        };
        Relationships: [];
        Update: {
          school_id?: string | null;
          lead_id?: string | null;
          contact_id?: string | null;
          activity_type?: "telefon" | "eposta" | "toplanti" | "ziyaret" | "not";
          summary?: string;
          details?: string | null;
          activity_date?: string;
        };
      };
      onboarding_milestones: {
        Row: {
          id: string;
          school_id: string;
          milestone_key: "sozlesme_imzalandi" | "koordinator_girildi" | "egitim_paketi_belirlendi" | "acilis_toplantisi_yapildi" | "certifiX_hesabi_olusturuldu";
          completed_at: string | null;
          completed_by: string | null;
        };
        Insert: {
          school_id: string;
          milestone_key: "sozlesme_imzalandi" | "koordinator_girildi" | "egitim_paketi_belirlendi" | "acilis_toplantisi_yapildi" | "certifiX_hesabi_olusturuldu";
          completed_at?: string | null;
          completed_by?: string | null;
        };
        Relationships: [];
        Update: {
          completed_at?: string | null;
          completed_by?: string | null;
        };
      };
      package_trainings: {
        Row: {
          package_id: string;
          training_id: string;
        };
        Insert: {
          package_id: string;
          training_id: string;
        };
        Relationships: [];
        Update: {
          package_id?: string;
          training_id?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          contract_id: string;
          training_id: string;
          unit_price: number;
          quantity: number;
          discount_rate: number;
          created_at: string;
        };
        Insert: {
          contract_id: string;
          training_id: string;
          unit_price: number;
          quantity?: number;
          discount_rate?: number;
        };
        Relationships: [];
        Update: {
          unit_price?: number;
          quantity?: number;
          discount_rate?: number;
        };
      };
      meeting_contacts: {
        Row: {
          meeting_id: string;
          contact_id: string;
        };
        Insert: {
          meeting_id: string;
          contact_id: string;
        };
        Relationships: [];
        Update: {
          meeting_id?: string;
          contact_id?: string;
        };
      };
      wg_members: {
        Row: {
          id: string;
          working_group_id: string;
          contact_id: string;
          role: "kolaylastirici" | "katilimci" | "gozlemci";
          school_id: string | null;
          joined_at: string;
          left_at: string | null;
        };
        Insert: {
          working_group_id: string;
          contact_id: string;
          role?: "kolaylastirici" | "katilimci" | "gozlemci";
          school_id?: string | null;
          joined_at?: string;
          left_at?: string | null;
        };
        Relationships: [];
        Update: {
          role?: "kolaylastirici" | "katilimci" | "gozlemci";
          school_id?: string | null;
          left_at?: string | null;
        };
      };
      wg_sessions: {
        Row: {
          id: string;
          working_group_id: string;
          session_date: string;
          title: string;
          format: "yuz_yuze" | "cevrimici" | "hibrit";
          notes: string | null;
          attendee_ids: string[];
          meeting_id: string | null;
          created_at: string;
        };
        Insert: {
          working_group_id: string;
          session_date: string;
          title: string;
          format?: "yuz_yuze" | "cevrimici" | "hibrit";
          notes?: string | null;
          attendee_ids?: string[];
          meeting_id?: string | null;
        };
        Relationships: [];
        Update: {
          session_date?: string;
          title?: string;
          format?: "yuz_yuze" | "cevrimici" | "hibrit";
          notes?: string | null;
          attendee_ids?: string[];
          meeting_id?: string | null;
        };
      };
      wg_phases: {
        Row: {
          id: string;
          working_group_id: string;
          phase_number: number;
          name: string;
          description: string | null;
          start_date: string | null;
          end_date: string | null;
          status: "planlandi" | "devam_ediyor" | "tamamlandi";
        };
        Insert: {
          working_group_id: string;
          phase_number: number;
          name: string;
          description?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          status?: "planlandi" | "devam_ediyor" | "tamamlandi";
        };
        Relationships: [];
        Update: {
          phase_number?: number;
          name?: string;
          description?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          status?: "planlandi" | "devam_ediyor" | "tamamlandi";
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
