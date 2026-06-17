// CSS modülü side-effect importları için
declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}
