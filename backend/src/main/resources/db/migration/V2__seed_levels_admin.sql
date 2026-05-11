INSERT INTO question_levels(stage, stage_name, level_no, name, sort_order, enabled) VALUES
('junior', '初级', 5, '初级五级', 10, 1),
('junior', '初级', 4, '初级四级', 20, 1),
('junior', '初级', 3, '初级三级', 30, 1),
('junior', '初级', 2, '初级二级', 40, 1),
('junior', '初级', 1, '初级一级', 50, 1),
('middle', '中级', 4, '中级四级', 60, 1),
('middle', '中级', 3, '中级三级', 70, 1),
('middle', '中级', 2, '中级二级', 80, 1),
('middle', '中级', 1, '中级一级', 90, 1),
('senior', '高级', 3, '高级三级', 100, 1),
('senior', '高级', 2, '高级二级', 110, 1),
('senior', '高级', 1, '高级一级', 120, 1);

-- Default admin: admin / admin123456
INSERT INTO admins(username, password_hash, role)
VALUES ('admin', '$2b$12$JKW3gmiphwsvcAXPVEUvFeXA6cJNFu9IFhUd8MARpv.dwItsq7vo2', 'admin');
