-- SQL-owned private file metadata includes the complete immutable CRM target in its reference keys.
ALTER TABLE app.private_files ADD CONSTRAINT private_file_photo_customer_key UNIQUE(tenant_id,location_id,customer_id,photo_role,id),
 ADD CONSTRAINT private_file_photo_wearer_key UNIQUE(tenant_id,location_id,customer_id,wearer_id,photo_role,id);
ALTER TABLE app.customer_photos ADD CONSTRAINT customer_photo_file_customer_fk FOREIGN KEY(tenant_id,location_id,customer_id,role,file_id) REFERENCES app.private_files(tenant_id,location_id,customer_id,photo_role,id),
 ADD CONSTRAINT customer_photo_file_wearer_fk FOREIGN KEY(tenant_id,location_id,customer_id,wearer_id,role,file_id) REFERENCES app.private_files(tenant_id,location_id,customer_id,wearer_id,photo_role,id);
