-- Productos de demostración (los 9 que estaban fijos en el código de la tienda).
-- Solo para desarrollo o para tener una base de ejemplo; las fotos son de Unsplash.
-- Uso: psql "$DATABASE_URL" -f seeds/demo-products.sql

INSERT INTO products (name, description, price, images, category, discipline, badge, stock, active, features)
SELECT 'Mat Eco Rubber Align 5mm', 'Mat profesional fabricado con caucho natural 100% biodegradable. Líneas de alineación láser para perfeccionar posturas y grip antideslizante máximo.', 42000, ARRAY['https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?auto=format&fit=crop&q=80&w=600']::text[], 'Mats', 'Yoga & Pilates', 'Eco Friendly', 20, true, ARRAY['Caucho natural de 5mm de espesor', 'Líneas de alineación central y transversal', 'Antideslizante extremo en húmedo y seco', 'Libre de PVC y químicos nocivos']::text[]
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Mat Eco Rubber Align 5mm');

INSERT INTO products (name, description, price, images, category, discipline, badge, stock, active, features)
SELECT 'Mat Extra Grip Reformer & Mat Pro 15mm', 'Colchoneta acolchada de alta densidad ideal para Pilates Mat, ejercicios de columna y protección articular. No se deforma con el uso intenso.', 48500, ARRAY['https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&q=80&w=600']::text[], 'Mats', 'Pilates', 'Pilates Pro', 20, true, ARRAY['15mm de grosor con memoria de amortiguación', 'Superficie de textura estriada anti-desplazamiento', 'Incluye correa de transporte ajustable', 'Resistente al agua y fácil de limpiar']::text[]
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Mat Extra Grip Reformer & Mat Pro 15mm');

INSERT INTO products (name, description, price, images, category, discipline, badge, stock, active, features)
SELECT 'Anillo de Pilates Magic Circle Flex', 'Aro flexible de fibra de vidrio recubierta de goma suave con almohadillas anatómicas laterales para entrenamiento de piernas, brazos y core.', 18500, ARRAY['https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&q=80&w=600']::text[], 'Pilates Equipment', 'Pilates', 'Más Vendido', 20, true, ARRAY['Diámetro de 38 cm estándar internacional', 'Resistencia progresiva ergonómica', 'Acolchado doble antiderrapante interior y exterior', 'Ideal para tonificación de aductores y torso']::text[]
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Anillo de Pilates Magic Circle Flex');

INSERT INTO products (name, description, price, images, category, discipline, badge, stock, active, features)
SELECT 'Bloques de Corcho Orgánico (Par)', 'Par de bloques rígidos de corcho natural con bordes biselados para firmeza, apoyo y flexibilidad en posturas exigentes.', 14200, ARRAY['https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&q=80&w=600']::text[], 'Accesorios', 'Yoga & Pilates', 'Sostenible', 20, true, ARRAY['100% corcho de roble certificado', 'Bordes redondeados para un agarre cómodo', 'Soporta peso de hasta 180kg sin flexionarse', 'Superficie suave y antibacteriana']::text[]
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Bloques de Corcho Orgánico (Par)');

INSERT INTO products (name, description, price, images, category, discipline, badge, stock, active, features)
SELECT 'Medias Antideslizantes Grip Pilates & Barre', 'Medias respirables con microgotas de silicona de alta adherencia en la planta para uso en máquinas Reformer, tablas y mat.', 6500, ARRAY['https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=600']::text[], 'Indumentaria', 'Pilates', 'Recomendado', 20, true, ARRAY['Algodón peinado con elastano respirable', 'Silicona antiderrapante de alta precisión', 'Ajuste perfecto en empeine con arco elástico', 'Disponibles en varias tallas (S, M, L)']::text[]
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Medias Antideslizantes Grip Pilates & Barre');

INSERT INTO products (name, description, price, images, category, discipline, badge, stock, active, features)
SELECT 'Cinta Strap de Estiramiento Algodón 2.5m', 'Correa de estiramiento asistido con hebilla metálica de doble argolla en D. Ayuda a profundizar estiramientos de isquiotibiales y hombros.', 8900, ARRAY['https://images.unsplash.com/photo-1599447421416-3414500d18a5?auto=format&fit=crop&q=80&w=600']::text[], 'Accesorios', 'Yoga & Pilates', NULL, 20, true, ARRAY['250 cm de largo x 3.8 cm de ancho', 'Hebilla metálica reforzada sin deslizamiento', 'Algodón suave para no dañar las manos', 'Ideal para flexibilización progresiva']::text[]
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Cinta Strap de Estiramiento Algodón 2.5m');

INSERT INTO products (name, description, price, images, category, discipline, badge, stock, active, features)
SELECT 'Kit Bandas Elásticas de Resistencia (Set x 3)', 'Set de 3 mini bands de látex natural de diferentes intensidades (Suave, Media, Fuerte) para trabajo de glúteos, cadera y estabilidad postural.', 12500, ARRAY['https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&q=80&w=600']::text[], 'Pilates Equipment', 'Pilates', 'Kit Completo', 20, true, ARRAY['Tres niveles de tensión codificados por color', 'Látex 100% natural ultra durable', 'Incluye bolsita de guardado en red', 'Ideales para complementar ejercicios de Pilates Mat']::text[]
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Kit Bandas Elásticas de Resistencia (Set x 3)');

INSERT INTO products (name, description, price, images, category, discipline, badge, stock, active, features)
SELECT 'Spray Orgánico Limpia Mat Eucalipto & Lavanda', 'Limpiador higienizante natural con aceites esenciales desinfectantes sin enjuague. Deja tu mat fresco, libre de bacterias y con aroma relajante.', 9800, ARRAY['https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&q=80&w=600']::text[], 'Aromaterapia', 'Yoga & Pilates', '100% Orgánico', 20, true, ARRAY['Fórmula vegana con agua destilada y aceites orgánicos', 'Propiedades antisépticas de lavanda y eucalipto', 'Envase de 250ml con gatillo pulverizador fino', 'Apto para mats de hule, corcho, PVC y TPE']::text[]
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Spray Orgánico Limpia Mat Eucalipto & Lavanda');

INSERT INTO products (name, description, price, images, category, discipline, badge, stock, active, features)
SELECT 'Calza Seamless High-Waist Yoga & Reformer', 'Calza de tiro alto sin costuras molestas. Tela de compresión suave que no transparenta en ninguna flexión.', 28000, ARRAY['https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=600']::text[], 'Indumentaria', 'Yoga & Pilates', NULL, 20, true, ARRAY['Tejido Seamless respirable de secado rápido', 'Cintura ancha moldeadora que no se desliza', 'Cero transparencias comprobado en flexiones profundas', 'Telas suaves al tacto para máximo confort']::text[]
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Calza Seamless High-Waist Yoga & Reformer');

