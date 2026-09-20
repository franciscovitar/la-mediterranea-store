insert into public.products (id, category, name, price, description, image, note, active) values
('botella','Botellas','Botella de aluminio',22000,'Aluminio resistente, diseño La Mediterránea.','/products/botella.jpg',null,true),
('taza_mediterranea','Tazas','Taza Mediterránea',20000,'Taza de cerámica blanca con el logo La Mediterránea.','/products/taza_mediterranea.jpg',null,true),
('vaso_termico','Vasos térmicos','Vaso térmico de aluminio',20000,'Con bombilla y tapa.','/products/vaso_termico.jpg',null,true),
('gorra_trucker','Gorras','Gorra trucker',10000,'Media malla, bordado del logo La Mediterránea.','/products/gorra_trucker.jpg',null,true),
('gorra_gabardina','Gorras','Gorra gabardina',12000,'Gabardina clásica, bordado del logo La Mediterránea.','/products/gorra_gabardina.jpg',null,true),
('gorra_m_chica','Gorras','Gorra clásica',12000,'Gorra estructurada, logo bordado al frente.','/products/gorra_m_chica.jpg',null,true),
('remera_sublimada','Remeras','Remera estampada de jersey de algodón',20000,'Todos los talles · varios colores.','/products/remera_med_negra.jpg','Todos los talles disponibles.',true),
('remera_algodon','Remeras','Remera estampada de jersey de algodón',20000,'Muy buena calidad · varios colores y talles.','/products/remera_m_beige.jpg',null,true),
('remera_uniforme','Remeras','Remera uniforme',9000,'Remera oficial de uniforme, logo grande al frente.','/products/remera_uniforme_negra.jpg',null,true),
('buzo_capucha_negro','Buzos','Buzo con capucha — negro',35000,'Con capucha y bolsillo canguro.','/products/buzo_capucha_negro_new.jpg',null,true),
('buzo_sin_capucha_negro','Buzos','Buzo sin capucha — negro',34000,'Cuello redondo, sin capucha.','/products/buzo_sin_capucha_negro_new.jpg',null,true),
('buzo_capucha_azul','Buzos','Buzo con capucha — azul marino',42000,'Con capucha y bolsillo canguro.','/products/buzo_capucha_azul_new.jpg',null,true),
('buzo_sin_capucha_azul','Buzos','Buzo sin capucha — azul marino',40000,'Cuello redondo, sin capucha.','/products/buzo_sin_capucha_azul_new.jpg',null,true),
('tote_bag','Tote Bags','Tote bag de lienzo de algodón',12000,'30 × 40 cm · lienzo de algodón natural.','/products/tote_bag.jpg',null,true)
on conflict (id) do update set
  category = excluded.category,
  name = excluded.name,
  price = excluded.price,
  description = excluded.description,
  image = excluded.image,
  note = excluded.note,
  active = excluded.active;

insert into public.product_colors (product_id, key, label, swatch, image, sort_order) values
('remera_sublimada','negra','Negra','#1a1a1a','/products/remera_med_negra.jpg',1),
('remera_sublimada','bordo','Bordó','#7a1f2b','/products/remera_med_bordo.jpg',2),
('remera_sublimada','blanca','Blanca','#f5f5f0','/products/remera_med_blanca.jpg',3),
('remera_sublimada','beige','Beige','#ddd0b8','/products/remera_med_beige.jpg',4),
('remera_sublimada','azul','Azul marino','#1b2338','/products/remera_med_azul.jpg',5),
('remera_algodon','beige','Beige','#ddd0b8','/products/remera_m_beige.jpg',1),
('remera_algodon','bordo','Bordó','#7a1f2b','/products/remera_m_bordo.jpg',2),
('remera_algodon','gris','Gris','#b9b7bc','/products/remera_m_gris.jpg',3),
('remera_algodon','azul','Azul marino','#1b2338','/products/remera_m_azul.jpg',4),
('remera_uniforme','negra','Negra','#1a1a1a','/products/remera_uniforme_negra.jpg',1),
('remera_uniforme','blanca','Blanca','#f5f5f0','/products/remera_uniforme_blanca.jpg',2)
on conflict (product_id, key) do update set
  label = excluded.label,
  swatch = excluded.swatch,
  image = excluded.image,
  sort_order = excluded.sort_order;

insert into public.product_sizes (product_id, size, sort_order) values
('remera_algodon','S',1),('remera_algodon','M',2),('remera_algodon','L',3),('remera_algodon','XL',4),
('remera_uniforme','S',1),('remera_uniforme','M',2),('remera_uniforme','L',3),('remera_uniforme','XL',4)
on conflict (product_id, size) do update set sort_order = excluded.sort_order;

-- Inventory is intentionally not guessed. Add rows only after the client confirms stock.
-- A product/variant with no inventory row is treated as untracked by the prepared checkout RPC.
