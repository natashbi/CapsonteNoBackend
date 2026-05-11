const pool = require('../config/database');
const { generateId, hashPassword } = require('../utils/helpers');

async function seed() {
  const client = await pool.connect();

  try {
    console.log('Seeding database with sample data...\n');

    await client.query('BEGIN');

    // Create users
    console.log('Creating users...');
    const adminPassword = await hashPassword('admin123');
    const coordPassword = await hashPassword('coord123');
    const directorPassword = await hashPassword('director123');
    const memberPassword = await hashPassword('member123');

    const users = [
      {
        id: 'U001',
        name: 'IT Administrator',
        username: 'admin',
        email: 'it@wup.edu.ph',
        password: adminPassword,
        role: 'admin'
      },
      {
        id: 'U002',
        name: 'Maria Santos',
        username: 'coordinator',
        email: 'maria.santos@wup.edu.ph',
        password: coordPassword,
        role: 'coordinator'
      },
      {
        id: 'U003',
        name: 'Dr. Vibelle Reyes',
        username: 'director',
        email: 'vreyes@wup.edu.ph',
        password: directorPassword,
        role: 'director'
      }
    ];

    for (const user of users) {
      await client.query(
        `INSERT INTO users (id, name, username, email, password, role, active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [user.id, user.name, user.username, user.email, user.password, user.role, true]
      );
    }
    console.log('✓ Users created');

    // Create members
    console.log('Creating members...');
    const members = [
      {
        id: 'M001',
        employeeId: '2024-001',
        name: 'Juan Dela Cruz',
        email: 'j.delacruz@wesleyan.edu.ph',
        phone: '0917-555-0101',
        department: 'College of Nursing',
        age: 48,
        gender: 'Male',
        civilStatus: 'Single',
        status: 'Permanent'
      },
      {
        id: 'M002',
        employeeId: '2024-002',
        name: 'Mark Steven Reyes',
        email: 'm.reyes@wesleyan.edu.ph',
        phone: '0917-555-0102',
        department: 'College of Engineering',
        age: 39,
        gender: 'Male',
        civilStatus: 'Married',
        status: 'Permanent'
      },
      {
        id: 'M003',
        employeeId: '2024-003',
        name: 'Ana Luisa Bautista',
        email: 'a.bautista@wesleyan.edu.ph',
        phone: '0917-555-0103',
        department: 'College of Arts & Sciences',
        age: 34,
        gender: 'Female',
        civilStatus: 'Single',
        status: 'Permanent'
      }
    ];

    for (const member of members) {
      await client.query(
        `INSERT INTO members (id, employee_id, name, email, phone, department, age, gender, civil_status, status, active, approval_status, approved_by, approved_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())`,
        [member.id, member.employeeId, member.name, member.email, member.phone, member.department, member.age, member.gender, member.civilStatus, member.status, true, 'Approved', 'Maria Santos']
      );
    }
    console.log('✓ Members created');

    // Create member users
    console.log('Creating member accounts...');
    const memberUsers = [
      {
        id: 'U006',
        name: 'Juan Dela Cruz',
        username: 'j.delacruz',
        email: 'j.delacruz@wesleyan.edu.ph',
        password: memberPassword,
        role: 'member',
        memberId: 'M001'
      },
      {
        id: 'U007',
        name: 'Mark Steven Reyes',
        username: 'm.reyes',
        email: 'm.reyes@wesleyan.edu.ph',
        password: memberPassword,
        role: 'member',
        memberId: 'M002'
      }
    ];

    for (const user of memberUsers) {
      await client.query(
        `INSERT INTO users (id, name, username, email, password, role, member_id, active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [user.id, user.name, user.username, user.email, user.password, user.role, user.memberId, true]
      );
    }
    console.log('✓ Member accounts created');

    // Create consultations
    console.log('Creating consultations...');
    const consultations = [
      {
        id: 'C001',
        serialNo: '000001',
        memberId: 'M001',
        date: '2026-04-20',
        patientType: 'Consultation',
        chiefComplaints: 'Persistent headache, dizziness for 1 week',
        peFindings: 'BP 140/90, mild pallor, no focal deficits',
        plan: 'CBC, UA, lipid profile; refer to Internal Medicine',
        diagnosis: 'Hypertension Stage 1, r/o anemia',
        status: 'Completed',
        physician: 'Dr. A. Mendoza',
        requestedBy: 'Carmelita Tiglao',
        approvedBy: 'Maria Santos'
      },
      {
        id: 'C002',
        serialNo: '000002',
        memberId: 'M002',
        date: '2026-04-18',
        patientType: 'Outpatient',
        chiefComplaints: 'Knee pain and swelling after PE class',
        peFindings: 'Right knee effusion, limited ROM, no instability',
        plan: 'Knee X-ray AP/Lat, NSAIDs, ice compress, restrict activity',
        diagnosis: 'Traumatic synovitis, right knee',
        status: 'Completed',
        physician: 'Dr. E. Tan',
        requestedBy: 'Mark Steven Reyes',
        approvedBy: 'Maria Santos'
      }
    ];

    for (const consult of consultations) {
      await client.query(
        `INSERT INTO consultations (id, serial_no, member_id, dependent_id, date, patient_type, chief_complaints, pe_findings, plan, diagnosis, status, physician, document_uploaded, requested_by, approved_by, approved_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())`,
        [consult.id, consult.serialNo, consult.memberId, null, consult.date, consult.patientType, consult.chiefComplaints, consult.peFindings, consult.plan, consult.diagnosis, consult.status, consult.physician, true, consult.requestedBy, consult.approvedBy]
      );
    }
    console.log('✓ Consultations created');

    // Create LOAs
    console.log('Creating LOAs...');
    const loas = [
      {
        id: 'LOA001',
        serialNo: '000001',
        memberId: 'M001',
        consultationId: 'C001',
        hospital: 'WUP-H',
        procedures: 'Complete Blood Count, Urinalysis',
        dateIssued: '2026-04-20',
        approvedAmount: 2500,
        status: 'Approved',
        approvedBy: 'Maria Santos'
      }
    ];

    for (const loa of loas) {
      await client.query(
        `INSERT INTO loas (id, serial_no, member_id, consultation_id, hospital, procedures, date_issued, approved_amount, status, approved_by, approved_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
        [loa.id, loa.serialNo, loa.memberId, loa.consultationId, loa.hospital, loa.procedures, loa.dateIssued, loa.approvedAmount, loa.status, loa.approvedBy]
      );
    }
    console.log('✓ LOAs created');

    // Create SOAs
    console.log('Creating SOAs...');
    const soas = [
      {
        id: 'SOA001',
        memberId: 'M001',
        loaId: 'LOA001',
        laboratory: 2000,
        xray: 1500,
        medicines: 800,
        others: 500,
        professionalFee: 1000,
        status: 'Pending',
        uploadedBy: 'Maria Santos'
      }
    ];

    for (const soa of soas) {
      const total = soa.laboratory + soa.xray + soa.medicines + soa.others + soa.professionalFee;
      await client.query(
        `INSERT INTO soas (id, member_id, loa_id, laboratory, xray, medicines, others, professional_fee, total, status, uploaded_by, uploaded_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
        [soa.id, soa.memberId, soa.loaId, soa.laboratory, soa.xray, soa.medicines, soa.others, soa.professionalFee, total, soa.status, soa.uploadedBy]
      );
    }
    console.log('✓ SOAs created');

    await client.query('COMMIT');

    console.log('\n✅ Database seeding completed successfully!\n');
    console.log('Sample credentials:');
    console.log('  Admin: admin / admin123');
    console.log('  Coordinator: coordinator / coord123');
    console.log('  Director: director / director123');
    console.log('  Member: j.delacruz / member123');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seeding error:', error);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
