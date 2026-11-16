-- Defesa em profundidade: URLs só http(s), mailto (links) ou caminho local.
-- Bloqueia javascript:, data: e "//host" mesmo se alguém gravar direto pela API.

alter table public.social_links
  add constraint social_links_url_safe check (url ~* '^(https?://|mailto:|/[^/\\])');

alter table public.projects
  add constraint projects_demo_url_safe check (demo_url is null or demo_url ~* '^(https?://|/[^/\\])'),
  add constraint projects_repo_url_safe check (repo_url is null or repo_url ~* '^(https?://|/[^/\\])'),
  add constraint projects_thumbnail_url_safe check (thumbnail_url is null or thumbnail_url ~* '^(https?://|/[^/\\])');

alter table public.project_images
  add constraint project_images_url_safe check (url ~* '^(https?://|/[^/\\])');

alter table public.profile
  add constraint profile_avatar_url_safe check (avatar_url is null or avatar_url ~* '^(https?://|/[^/\\])');

-- SVG pode carregar script quando aberto direto: só formatos raster no bucket de mídia.
update storage.buckets
   set allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/avif']
 where id = 'media';
