-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  photo TEXT,
  active BOOLEAN DEFAULT true,
  member_id VARCHAR(50),
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create members table
CREATE TABLE IF NOT EXISTS members (
  id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  department VARCHAR(255) NOT NULL,
  age INT,
  gender VARCHAR(20),
  civil_status VARCHAR(50),
  status VARCHAR(50) DEFAULT 'Permanent',
  photo TEXT,
  date_hired DATE,
  active BOOLEAN DEFAULT true,
  approval_status VARCHAR(50) DEFAULT 'Pending',
  approved_by VARCHAR(255),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create dependents table
CREATE TABLE IF NOT EXISTS dependents (
  id VARCHAR(50) PRIMARY KEY,
  member_id VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  relationship VARCHAR(50) NOT NULL,
  age INT,
  photo TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- Create consultations table
CREATE TABLE IF NOT EXISTS consultations (
  id VARCHAR(50) PRIMARY KEY,
  serial_no VARCHAR(50) UNIQUE NOT NULL,
  member_id VARCHAR(50) NOT NULL,
  dependent_id VARCHAR(50),
  date DATE NOT NULL,
  patient_type VARCHAR(50) NOT NULL,
  chief_complaints TEXT,
  pe_findings TEXT,
  plan TEXT,
  diagnosis TEXT,
  status VARCHAR(50) DEFAULT 'Pending',
  physician VARCHAR(255),
  document_uploaded BOOLEAN DEFAULT false,
  document_name VARCHAR(255),
  requested_by VARCHAR(255),
  approved_by VARCHAR(255),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (dependent_id) REFERENCES dependents(id) ON DELETE SET NULL
);

-- Create LOAs (Letters of Authorization) table
CREATE TABLE IF NOT EXISTS loas (
  id VARCHAR(50) PRIMARY KEY,
  serial_no VARCHAR(50) UNIQUE NOT NULL,
  member_id VARCHAR(50) NOT NULL,
  consultation_id VARCHAR(50),
  hospital VARCHAR(255) NOT NULL,
  procedures TEXT NOT NULL,
  clinical_impression TEXT,
  date_issued DATE NOT NULL,
  validity INT DEFAULT 7,
  requesting_doctor VARCHAR(255),
  approved_amount DECIMAL(12, 2),
  rb_per_day DECIMAL(12, 2),
  mbl DECIMAL(12, 2),
  status VARCHAR(50) DEFAULT 'Pending',
  approved_by VARCHAR(255),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  visit_date DATE,
  doctor_seen VARCHAR(255),
  visit_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE SET NULL
);

-- Create SOAs (Statement of Accounts) table
CREATE TABLE IF NOT EXISTS soas (
  id VARCHAR(50) PRIMARY KEY,
  member_id VARCHAR(50) NOT NULL,
  loa_id VARCHAR(50),
  laboratory DECIMAL(12, 2) DEFAULT 0,
  xray DECIMAL(12, 2) DEFAULT 0,
  medicines DECIMAL(12, 2) DEFAULT 0,
  others DECIMAL(12, 2) DEFAULT 0,
  professional_fee DECIMAL(12, 2) DEFAULT 0,
  total DECIMAL(12, 2) DEFAULT 0,
  remarks TEXT,
  status VARCHAR(50) DEFAULT 'Pending',
  reviewed_by VARCHAR(255),
  reviewed_at TIMESTAMP,
  uploaded_by VARCHAR(255),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- JSONB columns for itemized charges and procedures that were not completed
  line_items JSONB DEFAULT '[]'::jsonb,
  incomplete_items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (loa_id) REFERENCES loas(id) ON DELETE SET NULL
);

-- Create SOA documents table
CREATE TABLE IF NOT EXISTS soa_documents (
  id VARCHAR(50) PRIMARY KEY,
  soa_id VARCHAR(50) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50),
  file_size INT,
  description TEXT,
  -- Stores base64-encoded file payload uploaded by the coordinator
  data TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (soa_id) REFERENCES soas(id) ON DELETE CASCADE
);

-- Create audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50),
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100),
  entity_id VARCHAR(50),
  details JSONB,
  ip_address VARCHAR(45),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  coverage_limit DECIMAL(12, 2) DEFAULT 150000,
  member_consult_limit INT DEFAULT 24,
  dependent_consult_limit INT DEFAULT 4,
  loa_validity_days INT DEFAULT 7,
  low_balance_threshold DECIMAL(12, 2) DEFAULT 30000,
  program_year_start VARCHAR(50) DEFAULT 'January',
  org_name VARCHAR(255) DEFAULT 'Wesleyan University — Philippines',
  primary_contact VARCHAR(255),
  primary_email VARCHAR(255),
  require_mfa BOOLEAN DEFAULT false,
  auto_logout BOOLEAN DEFAULT true,
  strong_passwords BOOLEAN DEFAULT true,
  audit_all_actions BOOLEAN DEFAULT true,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50),
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_consultations_member_id ON consultations(member_id);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);
CREATE INDEX IF NOT EXISTS idx_loas_member_id ON loas(member_id);
CREATE INDEX IF NOT EXISTS idx_loas_status ON loas(status);
CREATE INDEX IF NOT EXISTS idx_soas_member_id ON soas(member_id);
CREATE INDEX IF NOT EXISTS idx_soas_status ON soas(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
