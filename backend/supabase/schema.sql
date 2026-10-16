create extension if not exists unaccent;

create table if not exists public.enfermedades (
  id text primary key,
  nombre text not null unique,
  categoria text not null,
  especialista text not null default 'Medicina general',
  resumen text not null,
  sintomas text[] not null default '{}',
  prevencion text[] not null default '{}',
  alertas text[] not null default '{}',
  provincias text[] not null default '{}',
  zona text not null default 'Todo el país',
  color text not null default 'green' check (color in ('green', 'coral', 'blue', 'amber')),
  fuentes jsonb not null default '[]'::jsonb,
  origen text not null default 'catalogo' check (origen in ('catalogo', 'manual', 'ALBA')),
  estado_revision text not null default 'verificada' check (estado_revision in ('verificada', 'pendiente')),
  publicada boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.enfermedades add column if not exists especialista text;
update public.enfermedades
set especialista = 'Medicina general'
where especialista is null or btrim(especialista) = '';
alter table public.enfermedades alter column especialista set default 'Medicina general';
alter table public.enfermedades alter column especialista set not null;

update public.enfermedades
set publicada = true
where origen = 'ALBA' and estado_revision = 'pendiente';

alter table public.enfermedades enable row level security;

drop policy if exists "Lectura publica de enfermedades" on public.enfermedades;
create policy "Lectura publica de enfermedades"
on public.enfermedades for select
to anon, authenticated
using (publicada = true);

insert into public.enfermedades (id, nombre, categoria, resumen, sintomas, prevencion, alertas, provincias, zona, color, fuentes)
values
('dengue', 'Dengue', 'Transmitida por vectores', 'Infección viral transmitida principalmente por el mosquito Aedes aegypti.', array['Fiebre alta','Dolor de cabeza','Dolor detrás de los ojos','Dolor muscular y articular','Náuseas o sarpullido'], array['Eliminar recipientes con agua estancada','Usar repelente y ropa que cubra la piel','Colocar mosquiteros o mallas'], array['Dolor abdominal intenso','Vómitos persistentes','Sangrado','Somnolencia o debilidad intensa'], array['Esmeraldas','Manabí','Santo Domingo de los Tsáchilas','Los Ríos','Guayas','Santa Elena','El Oro','Sucumbíos','Napo','Orellana','Pastaza','Morona Santiago','Zamora Chinchipe'], 'Costa y Amazonía', 'coral', '[{"titulo":"Dengue","organismo":"OPS/OMS","url":"https://www.paho.org/es/temas/dengue"}]'),
('influenza', 'Influenza', 'Respiratoria', 'Enfermedad respiratoria contagiosa causada por virus de la influenza.', array['Fiebre o escalofríos','Tos','Dolor de garganta','Dolor muscular','Cansancio'], array['Vacunarse según las recomendaciones oficiales','Lavarse las manos','Cubrirse al toser y ventilar espacios'], array['Dificultad para respirar','Dolor persistente en el pecho','Confusión','Empeoramiento repentino'], array['Azuay','Bolívar','Cañar','Carchi','Chimborazo','Cotopaxi','El Oro','Esmeraldas','Galápagos','Guayas','Imbabura','Loja','Los Ríos','Manabí','Morona Santiago','Napo','Orellana','Pastaza','Pichincha','Santa Elena','Santo Domingo de los Tsáchilas','Sucumbíos','Tungurahua','Zamora Chinchipe'], 'Todo el país', 'blue', '[{"titulo":"Influenza estacional","organismo":"OMS","url":"https://www.who.int/es/news-room/fact-sheets/detail/influenza-(seasonal)"}]'),
('covid-19', 'COVID-19', 'Respiratoria', 'Enfermedad infecciosa causada por el virus SARS-CoV-2.', array['Fiebre','Tos','Dolor de garganta','Cansancio','Pérdida reciente del gusto u olfato'], array['Mantener la vacunación recomendada','Ventilar espacios','Usar mascarilla si hay síntomas o alto riesgo'], array['Dificultad para respirar','Dolor o presión en el pecho','Confusión','Coloración azulada o grisácea'], array['Azuay','Bolívar','Cañar','Carchi','Chimborazo','Cotopaxi','El Oro','Esmeraldas','Galápagos','Guayas','Imbabura','Loja','Los Ríos','Manabí','Morona Santiago','Napo','Orellana','Pastaza','Pichincha','Santa Elena','Santo Domingo de los Tsáchilas','Sucumbíos','Tungurahua','Zamora Chinchipe'], 'Todo el país', 'blue', '[{"titulo":"COVID-19","organismo":"OMS","url":"https://www.who.int/es/health-topics/coronavirus"}]'),
('malaria', 'Malaria', 'Transmitida por vectores', 'Enfermedad parasitaria transmitida por mosquitos Anopheles infectados.', array['Fiebre','Escalofríos','Sudoración','Dolor de cabeza','Cansancio'], array['Usar mosquiteros tratados','Aplicar repelente','Buscar atención temprana tras exposición en zonas de riesgo'], array['Alteración de conciencia','Convulsiones','Dificultad respiratoria','Debilidad extrema'], array['Esmeraldas','Carchi','Sucumbíos','Napo','Orellana','Pastaza','Morona Santiago','Zamora Chinchipe'], 'Amazonía y zonas tropicales', 'green', '[{"titulo":"Malaria","organismo":"OPS/OMS","url":"https://www.paho.org/es/temas/malaria"}]'),
('gastroenteritis', 'Gastroenteritis', 'Digestiva', 'Inflamación del estómago y los intestinos, frecuentemente asociada a infecciones.', array['Diarrea','Náuseas o vómitos','Dolor abdominal','Fiebre leve','Deshidratación'], array['Lavarse las manos','Consumir agua segura','Lavar y cocinar bien los alimentos'], array['Sangre en las heces','Incapacidad para beber líquidos','Signos de deshidratación','Dolor abdominal intenso'], array['Azuay','Bolívar','Cañar','Carchi','Chimborazo','Cotopaxi','El Oro','Esmeraldas','Galápagos','Guayas','Imbabura','Loja','Los Ríos','Manabí','Morona Santiago','Napo','Orellana','Pastaza','Pichincha','Santa Elena','Santo Domingo de los Tsáchilas','Sucumbíos','Tungurahua','Zamora Chinchipe'], 'Todo el país', 'amber', '[{"titulo":"Enfermedades diarreicas","organismo":"OMS","url":"https://www.who.int/es/news-room/fact-sheets/detail/diarrhoeal-disease"}]'),
('leptospirosis', 'Leptospirosis', 'Bacteriana', 'Infección bacteriana relacionada con agua o suelo contaminado por orina de animales.', array['Fiebre','Dolor de cabeza','Dolor muscular intenso','Ojos enrojecidos','Náuseas'], array['Evitar aguas posiblemente contaminadas','Usar botas y guantes','Controlar roedores y almacenar residuos correctamente'], array['Color amarillo en piel u ojos','Dificultad respiratoria','Disminución de orina','Sangrado'], array['Esmeraldas','Manabí','Los Ríos','Guayas','El Oro','Sucumbíos','Napo','Orellana','Pastaza'], 'Zonas húmedas o inundadas', 'amber', '[{"titulo":"Leptospirosis","organismo":"OPS/OMS","url":"https://www.paho.org/es/temas/leptospirosis"}]'),
('hipertension', 'Hipertensión arterial', 'Crónica', 'Elevación persistente de la presión arterial que a menudo no presenta síntomas.', array['Frecuentemente no presenta síntomas','Dolor de cabeza en algunos casos','Mareo ocasional'], array['Controlar periódicamente la presión','Reducir el exceso de sal','Mantener actividad física y controles médicos'], array['Dolor de pecho','Dificultad para respirar','Debilidad de un lado del cuerpo','Alteración repentina de la visión o el habla'], array['Azuay','Bolívar','Cañar','Carchi','Chimborazo','Cotopaxi','El Oro','Esmeraldas','Galápagos','Guayas','Imbabura','Loja','Los Ríos','Manabí','Morona Santiago','Napo','Orellana','Pastaza','Pichincha','Santa Elena','Santo Domingo de los Tsáchilas','Sucumbíos','Tungurahua','Zamora Chinchipe'], 'Todo el país', 'coral', '[{"titulo":"Hipertensión","organismo":"OMS","url":"https://www.who.int/es/news-room/fact-sheets/detail/hypertension"}]'),
('diabetes-tipo-2', 'Diabetes tipo 2', 'Crónica', 'Condición crónica que afecta la forma en que el organismo regula la glucosa en la sangre.', array['Mucha sed','Orinar con frecuencia','Visión borrosa','Cansancio','Heridas que tardan en sanar'], array['Mantener una alimentación equilibrada','Realizar actividad física','Acudir a controles si existen factores de riesgo'], array['Confusión o desmayo','Respiración rápida','Vómitos persistentes','Deshidratación intensa'], array['Azuay','Bolívar','Cañar','Carchi','Chimborazo','Cotopaxi','El Oro','Esmeraldas','Galápagos','Guayas','Imbabura','Loja','Los Ríos','Manabí','Morona Santiago','Napo','Orellana','Pastaza','Pichincha','Santa Elena','Santo Domingo de los Tsáchilas','Sucumbíos','Tungurahua','Zamora Chinchipe'], 'Todo el país', 'green', '[{"titulo":"Diabetes","organismo":"OMS","url":"https://www.who.int/es/news-room/fact-sheets/detail/diabetes"}]')
on conflict (id) do update set
  nombre = excluded.nombre,
  categoria = excluded.categoria,
  resumen = excluded.resumen,
  sintomas = excluded.sintomas,
  prevencion = excluded.prevencion,
  alertas = excluded.alertas,
  provincias = excluded.provincias,
  zona = excluded.zona,
  color = excluded.color,
  fuentes = excluded.fuentes,
  updated_at = now();

update public.enfermedades
set especialista = case id
  when 'dengue' then 'Infectología'
  when 'influenza' then 'Medicina familiar'
  when 'covid-19' then 'Medicina familiar'
  when 'malaria' then 'Infectología'
  when 'gastroenteritis' then 'Gastroenterología'
  when 'leptospirosis' then 'Infectología'
  when 'hipertension' then 'Cardiología'
  when 'diabetes-tipo-2' then 'Endocrinología'
  else especialista
end
where id in ('dengue', 'influenza', 'covid-19', 'malaria', 'gastroenteritis', 'leptospirosis', 'hipertension', 'diabetes-tipo-2');
