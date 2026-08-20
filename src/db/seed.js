import { initializeDatabase, getDatabase, closeDatabase } from './connection.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  try {
    console.log('🌱 Seeding database with test data...');
    await initializeDatabase();
    const db = getDatabase();

    // Create service categories
    console.log('📂 Creating service categories...');
    const categories = [
      { id: uuidv4(), name: 'Water', icon: '💧', description: 'Water delivery services' },
      { id: uuidv4(), name: 'Gas', icon: '🔥', description: 'LPG/Gas delivery services' },
      { id: uuidv4(), name: 'Maintenance', icon: '🔧', description: 'Maintenance and repair services' },
      { id: uuidv4(), name: 'Waste', icon: '🗑️', description: 'Waste collection services' },
      { id: uuidv4(), name: 'Electricity', icon: '⚡', description: 'Electricity services' },
      { id: uuidv4(), name: 'Security', icon: '🛡️', description: 'Security services' },
    ];

    for (const cat of categories) {
      await db`INSERT INTO service_categories (id, name, icon, description) VALUES (${cat.id}, ${cat.name}, ${cat.icon}, ${cat.description})`;
    }

    // Create admin user
    console.log('👤 Creating admin user...');
    const adminId = uuidv4();
    const adminHash = await bcrypt.hash('Admin@123', 10);
    await db`INSERT INTO users (id, email, password_hash, full_name, phone) VALUES (${adminId}, 'admin@communityos.local', ${adminHash}, 'System Admin', '+254700000000')`;
    await db`INSERT INTO user_roles (user_id, role) VALUES (${adminId}, 'admin')`;

    // Create community
    console.log('🏘️ Creating test community...');
    const communityId = uuidv4();
    await db`INSERT INTO communities (id, name, location, country, currency, created_by) VALUES (${communityId}, 'Green Valley Estate', 'Nairobi, Kenya', 'KE', 'KES', ${adminId})`;

    // Create buildings
    console.log('🏢 Creating buildings...');
    const block_a = uuidv4();
    const block_b = uuidv4();
    await db`INSERT INTO buildings (id, community_id, name, floors) VALUES (${block_a}, ${communityId}, 'Block A', 5)`;
    await db`INSERT INTO buildings (id, community_id, name, floors) VALUES (${block_b}, ${communityId}, 'Block B', 5)`;

    // Create manager user
    console.log('👨‍💼 Creating community manager...');
    const managerId = uuidv4();
    const managerHash = await bcrypt.hash('Manager@123', 10);
    await db`INSERT INTO users (id, email, password_hash, full_name, phone) VALUES (${managerId}, 'manager@greenvalley.local', ${managerHash}, 'John Manager', '+254700000001')`;
    await db`INSERT INTO user_roles (user_id, community_id, role) VALUES (${managerId}, ${communityId}, 'manager')`;

    // Create residents
    console.log('👥 Creating residents...');
    const residents = [];
    for (let i = 1; i <= 5; i++) {
      const residentId = uuidv4();
      const residentHash = await bcrypt.hash('Resident@123', 10);
      const email = `resident${i}@greenvalley.local`;
      const fullName = `Resident ${i}`;
      const phone = `+25470000000${i}`;
      
      await db`INSERT INTO users (id, email, password_hash, full_name, phone) VALUES (${residentId}, ${email}, ${residentHash}, ${fullName}, ${phone})`;
      await db`INSERT INTO user_roles (user_id, community_id, role) VALUES (${residentId}, ${communityId}, 'resident')`;
      residents.push(residentId);
    }

    // Create units and assign residents
    console.log('🏠 Creating units...');
    for (let i = 1; i <= 3; i++) {
      const unitId = uuidv4();
      const residentId = residents[i - 1];
      const unitNumber = `A${i}0${i}`;
      await db`INSERT INTO units (id, community_id, building_id, unit_number, resident_id) VALUES (${unitId}, ${communityId}, ${block_a}, ${unitNumber}, ${residentId})`;
    }

    // Create services for the community
    console.log('⚙️ Creating services for community...');
    const waterCatId = categories[0].id;
    const gasCatId = categories[1].id;
    const maintenanceCatId = categories[2].id;
    const wasteCatId = categories[3].id;

    const services = [
      { id: uuidv4(), categoryId: waterCatId, name: 'Water Delivery', status: 'operational' },
      { id: uuidv4(), categoryId: gasCatId, name: 'LPG Gas Delivery', status: 'operational' },
      { id: uuidv4(), categoryId: maintenanceCatId, name: 'Maintenance & Repairs', status: 'operational' },
      { id: uuidv4(), categoryId: wasteCatId, name: 'Waste Collection', status: 'operational' },
    ];

    const serviceIds = [];
    for (const svc of services) {
      await db`INSERT INTO services (id, community_id, category_id, name, status) VALUES (${svc.id}, ${communityId}, ${svc.categoryId}, ${svc.name}, ${svc.status})`;
      serviceIds.push(svc.id);
    }

    // Create providers
    console.log('🏪 Creating service providers...');
    const providers = [];
    const providerNames = ['AquaFlow', 'GasPlus', 'ProMaintenance'];
    
    for (let i = 0; i < providerNames.length; i++) {
      const providerId = uuidv4();
      const providerUserId = uuidv4();
      const providerHash = await bcrypt.hash('Provider@123', 10);
      const email = `${providerNames[i].toLowerCase()}@communityos.local`;
      const companyName = providerNames[i];
      const phone = `+25475000000${i}`;

      // Create provider user
      await db`INSERT INTO users (id, email, password_hash, full_name, phone) VALUES (${providerUserId}, ${email}, ${providerHash}, ${companyName}, ${phone})`;
      await db`INSERT INTO user_roles (user_id, community_id, role) VALUES (${providerUserId}, ${communityId}, 'provider')`;

      // Create service provider mapping
      await db`INSERT INTO service_providers (id, user_id, community_id, service_id, company_name, phone, email, status, verified_at) VALUES (${providerId}, ${providerUserId}, ${communityId}, ${serviceIds[i]}, ${companyName}, ${phone}, ${email}, 'active', NOW())`;
      
      providers.push({ id: providerId, userId: providerUserId, serviceId: serviceIds[i] });
    }

    // Create workers
    console.log('👷 Creating workers...');
    const workers = [];
    for (let i = 1; i <= 3; i++) {
      const workerId = uuidv4();
      const workerHash = await bcrypt.hash('Worker@123', 10);
      const email = `worker${i}@communityos.local`;
      const fullName = `Worker ${i}`;
      const phone = `+25476000000${i}`;

      await db`INSERT INTO users (id, email, password_hash, full_name, phone) VALUES (${workerId}, ${email}, ${workerHash}, ${fullName}, ${phone})`;
      
      // Assign worker to a provider
      const providerIndex = (i - 1) % providers.length;
      const provider = providers[providerIndex];
      await db`INSERT INTO user_roles (user_id, community_id, role) VALUES (${workerId}, ${communityId}, 'worker')`;
      
      workers.push(workerId);
    }

    console.log('✅ Database seeding completed successfully!');
    console.log('\n📋 Test Credentials:');
    console.log('  Admin: admin@communityos.local / Admin@123');
    console.log('  Manager: manager@greenvalley.local / Manager@123');
    console.log('  Resident 1: resident1@greenvalley.local / Resident@123');
    console.log('  Provider (AquaFlow): aquaflow@communityos.local / Provider@123');
    console.log('  Worker 1: worker1@communityos.local / Worker@123');

    await closeDatabase();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error(error);
    await closeDatabase();
    process.exit(1);
  }
}

seed();
