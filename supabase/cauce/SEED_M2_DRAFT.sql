-- Fictional test data applied on 2026-11-21 in isolated project erswrerhpmvviedudzit.
-- Reconcile counts before rerunning: inserts are not intended to be re-applied.
-- Synthetic products/assets only. Never import historic customer records.
begin;
insert into public.cauce_products (id, slug, category, name, price, description, image, material, dimensions, care, badge, featured, active)
values
('taza-bruma', 'taza-bruma', 'Mesa', 'Taza Bruma', 32500, 'Cerámica esmaltada con moteado natural y un asa generosa. Para esos primeros minutos del día.', '/cauce/catalog-a-00.webp', 'Cerámica de gres esmaltada', '330 ml · 9 × 10 cm', 'Lavar a mano o en lavavajillas con ciclo delicado.', 'Más elegido', true, true),
('jarron-tierra', 'jarron-tierra', 'Decoración', 'Jarrón Tierra', 68900, 'Una silueta escultórica en arcilla de acabado mate que encuentra su lugar en cualquier rincón.', '/cauce/catalog-a-01.webp', 'Terracota artesanal sin esmaltar', '32 × 14 cm', 'Limpiar con paño seco. Para flores secas o ramas.', NULL, true, true),
('vela-ambar', 'vela-ambar', 'Aromas', 'Vela Ámbar', 28500, 'Luz cálida y notas suaves de cedro, higo y vainilla para bajar un cambio.', '/cauce/catalog-a-02.webp', 'Cera vegetal · vaso de vidrio ámbar', '180 g · hasta 35 horas', 'No dejar encendida sin supervisión. Recortar mecha antes de cada uso.', 'Nuevo', true, true),
('bandeja-nogal', 'bandeja-nogal', 'Mesa', 'Bandeja Nogal', 74500, 'Madera de veta protagonista. Una pieza simple para servir, ordenar o decorar.', '/cauce/catalog-a-03.webp', 'Madera de nogal con terminación al aceite', '36 × 24 × 3 cm', 'Limpiar con paño húmedo. No sumergir.', NULL, true, true),
('almohadon-calma', 'almohadon-calma', 'Textiles', 'Almohadón Calma', 49900, 'Trama de lino con textura viva para sumar confort sin llenar el espacio.', '/cauce/catalog-a-04.webp', 'Funda de lino y algodón; relleno incluido', '45 × 45 cm', 'Lavar funda del revés con agua fría.', NULL, false, true),
('lampara-linea', 'lampara-linea', 'Iluminación', 'Lámpara Línea', 158000, 'Iluminación de acento con cuerpo metálico articulado y presencia discreta.', '/cauce/catalog-a-05.webp', 'Acero con acabado latón cepillado', 'Altura regulable · 48 cm', 'Limpiar desenchufada con paño seco. Lámpara LED no incluida.', NULL, false, true),
('jarra-oliva', 'jarra-oliva', 'Mesa', 'Jarra Oliva', 45500, 'Vidrio de tono oliva y líneas orgánicas. Una pieza que se luce también vacía.', '/cauce/catalog-b-00.webp', 'Vidrio reciclado soplado', '1 litro · 28 cm de alto', 'Lavar a mano. Evitar cambios térmicos bruscos.', NULL, false, true),
('canasto-raiz', 'canasto-raiz', 'Organización', 'Canasto Raíz', 62500, 'Fibras trenzadas a mano para darle un lugar a eso que querés tener cerca.', '/cauce/catalog-b-01.webp', 'Fibra vegetal trenzada', '32 × 25 cm · con asas', 'Limpiar con cepillo suave, conservar seco.', 'Artesanal', false, true),
('camino-lino', 'camino-lino', 'Textiles', 'Camino Lino', 38500, 'Un textil noble con rayas finas, pensado para vestir la mesa todos los días.', '/cauce/catalog-b-02.webp', '100 % lino lavado', '45 × 180 cm', 'Lavar con agua fría. Secar a la sombra.', NULL, false, true),
('cuaderno-pausa', 'cuaderno-pausa', 'Escritorio', 'Cuaderno Pausa', 29900, 'Tapa de cuero cálido y páginas lisas para dejar que aparezcan las ideas.', '/cauce/catalog-b-03.webp', 'Tapa de cuero; papel ahuesado', 'A5 · 160 páginas', 'Guardar lejos de humedad y sol directo.', NULL, false, true),
('bolso-aire', 'bolso-aire', 'Accesorios', 'Bolso Aire', 35900, 'Un tote de lona resistente y forma relajada para llevar lo esencial.', '/cauce/catalog-b-04.webp', 'Lona de algodón crudo', '40 × 36 × 12 cm', 'Lavar a mano con agua fría.', NULL, false, true),
('cuenco-orilla', 'cuenco-orilla', 'Mesa', 'Cuenco Orilla', 42900, 'Cerámica de textura acanalada y esmalte marfil. Ideal para servir y compartir.', '/cauce/catalog-b-05.webp', 'Cerámica de gres', '24 cm de diámetro', 'Apto para lavavajillas. No usar sobre fuego directo.', NULL, false, true);

-- Fictional initial availability; stock adjustments after setup must use the RPC.
update public.cauce_inventory as i set stock = v.stock
from (values
  ('taza-bruma', 26),
  ('jarron-tierra', 8),
  ('vela-ambar', 17),
  ('bandeja-nogal', 11),
  ('almohadon-calma', 9),
  ('lampara-linea', 5),
  ('jarra-oliva', 13),
  ('canasto-raiz', 4),
  ('camino-lino', 21),
  ('cuaderno-pausa', 20),
  ('bolso-aire', 8),
  ('cuenco-orilla', 12)
) as v(id, stock) where i.product_id = v.id;
commit;
