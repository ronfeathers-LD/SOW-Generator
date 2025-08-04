-- Rename lean_data_signators table to lean_data_signatories
ALTER TABLE lean_data_signators RENAME TO lean_data_signatories;

-- Update the trigger name to match the new table name
DROP TRIGGER IF EXISTS update_lean_data_signators_updated_at ON lean_data_signatories;
CREATE TRIGGER update_lean_data_signatories_updated_at 
  BEFORE UPDATE ON lean_data_signatories 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 