ALTER TABLE productos ADD COLUMN IF NOT EXISTS clasificacion_pasteleria TEXT;
UPDATE productos SET categoria = 'sembrados' WHERE categoria = 'viennoiserie';
