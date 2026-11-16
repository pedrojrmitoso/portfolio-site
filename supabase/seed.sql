-- Dados FAKE para teste. Substitua pelo painel /admin.
insert into public.profile (id, full_name, role, bio, location, email, available, resume_url)
values (1, 'Seu Nome',
  '{"pt":"Cientista de Dados · BI · IA","en":"Data Scientist · BI · AI","fr":"Data Scientist · BI · IA"}',
  '{"pt":"Transformo dados em decisões: pipelines, dashboards e modelos de IA em produção.","en":"I turn data into decisions: pipelines, dashboards and AI models in production.","fr":"Je transforme les données en décisions : pipelines, tableaux de bord et modèles d''IA en production."}',
  'Brasil', 'voce@exemplo.com', true, '{}')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.social_links (platform, label, url, sort_order) values
  ('github',   'GitHub',   'https://github.com/seu-usuario', 1),
  ('linkedin', 'LinkedIn', 'https://www.linkedin.com/in/seu-usuario', 2),
  ('indeed',   'Indeed',   'https://profile.indeed.com/seu-usuario', 3),
  ('email',    'E-mail',   'mailto:voce@exemplo.com', 4);

insert into public.technologies (name, icon, category, sort_order) values
  ('Python',       'python',       'languages', 1),
  ('SQL',          'postgresql',   'languages', 2),
  ('TypeScript',   'typescript',   'languages', 3),
  ('Pandas',       'pandas',       'data', 10),
  ('NumPy',        'numpy',        'data', 11),
  ('Apache Spark', 'spark',        'data', 12),
  ('Airflow',      'airflow',      'data', 13),
  ('Power BI',     'powerbi',      'bi', 20),
  ('Tableau',      'tableau',      'bi', 21),
  ('Looker',       'looker',       'bi', 22),
  ('scikit-learn', 'scikitlearn',  'ai', 30),
  ('PyTorch',      'pytorch',      'ai', 31),
  ('LangChain',    'langchain',    'ai', 32),
  ('OpenAI',       'openai',       'ai', 33),
  ('Claude',       'claude',       'ai', 34),
  ('Supabase',     'supabase',     'cloud', 40),
  ('BigQuery',     'bigquery',     'cloud', 41),
  ('AWS',          'aws',          'cloud', 42),
  ('Docker',       'docker',       'tools', 50),
  ('Git',          'git',          'tools', 51),
  ('Next.js',      'nextjs',       'tools', 52),
  ('Streamlit',    'streamlit',    'tools', 53);

insert into public.projects (slug, title, summary, description, thumbnail_url, demo_url, repo_url, featured, sort_order) values
  ('churn-predictor',
   '{"pt":"Previsão de Churn","en":"Churn Predictor","fr":"Prédiction du churn"}',
   '{"pt":"Modelo que antecipa cancelamentos com 89% de AUC.","en":"Model that anticipates cancellations with 0.89 AUC.","fr":"Modèle qui anticipe les résiliations avec 0,89 d''AUC."}',
   '{"pt":"Pipeline completo: ingestão, features, treino e API de inferência.","en":"End-to-end pipeline: ingestion, features, training and inference API.","fr":"Pipeline complet : ingestion, features, entraînement et API d''inférence."}',
   '/seed/churn-predictor.webp', 'https://exemplo.com', 'https://github.com/seu-usuario/churn', true, 1),
  ('sales-dashboard',
   '{"pt":"Dashboard Comercial","en":"Sales Dashboard","fr":"Tableau de bord commercial"}',
   '{"pt":"KPIs de vendas em tempo real para 40 lojas.","en":"Real-time sales KPIs for 40 stores.","fr":"KPI de ventes en temps réel pour 40 magasins."}',
   '{"pt":"Modelagem dimensional e dashboard executivo.","en":"Dimensional modeling and executive dashboard.","fr":"Modélisation dimensionnelle et tableau de bord exécutif."}',
   '/seed/sales-dashboard.webp', 'https://exemplo.com', null, true, 2),
  ('rag-assistant',
   '{"pt":"Assistente RAG","en":"RAG Assistant","fr":"Assistant RAG"}',
   '{"pt":"Chat com documentos internos usando LLM.","en":"Chat with internal docs using an LLM.","fr":"Chat avec des documents internes via un LLM."}',
   '{"pt":"Busca vetorial, reranking e avaliação de respostas.","en":"Vector search, reranking and answer evaluation.","fr":"Recherche vectorielle, reranking et évaluation des réponses."}',
   '/seed/rag-assistant.webp', 'https://exemplo.com', 'https://github.com/seu-usuario/rag', true, 3),
  ('data-pipeline',
   '{"pt":"Pipeline de Dados","en":"Data Pipeline","fr":"Pipeline de données"}',
   '{"pt":"ETL diário de 20M de linhas, orquestrado.","en":"Daily ETL of 20M rows, orchestrated.","fr":"ETL quotidien de 20M de lignes, orchestré."}',
   '{"pt":"Orquestração, testes de qualidade e alertas.","en":"Orchestration, data quality tests and alerts.","fr":"Orchestration, tests de qualité et alertes."}',
   '/seed/data-pipeline.webp', null, 'https://github.com/seu-usuario/pipeline', false, 4);

insert into public.project_images (project_id, url, sort_order)
select p.id, format('/seed/%s-%s.webp', p.slug, n), n
from public.projects p cross join generate_series(1, 3) n;

insert into public.project_technologies (project_id, technology_id)
select p.id, t.id
from public.projects p
join public.technologies t on t.name = any (case p.slug
  when 'churn-predictor' then array['Python','scikit-learn','Pandas','Docker']
  when 'sales-dashboard' then array['Power BI','SQL','BigQuery']
  when 'rag-assistant'   then array['Python','LangChain','Claude','Supabase','Next.js']
  when 'data-pipeline'   then array['Airflow','Apache Spark','Python','AWS']
end);

insert into public.experiences (company, role, description, start_date, end_date, sort_order) values
  ('Empresa Exemplo', '{"pt":"Cientista de Dados","en":"Data Scientist","fr":"Data Scientist"}',
   '{"pt":"Modelos preditivos e MLOps.","en":"Predictive models and MLOps.","fr":"Modèles prédictifs et MLOps."}', '2023-03-01', null, 1),
  ('Outra Empresa', '{"pt":"Analista de BI","en":"BI Analyst","fr":"Analyste BI"}',
   '{"pt":"Dashboards e modelagem dimensional.","en":"Dashboards and dimensional modeling.","fr":"Tableaux de bord et modélisation dimensionnelle."}', '2021-01-01', '2023-02-28', 2);
