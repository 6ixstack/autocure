import mongoose from 'mongoose';
import User from '@/models/User';
import Vehicle from '@/models/Vehicle';
import Service from '@/models/Service';
import Appointment from '@/models/Appointment';

const seedDemoData = async (): Promise<void> => {
  try {
    console.log('🌱 Seeding demo data...');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Vehicle.deleteMany({}),
      Service.deleteMany({}),
      Appointment.deleteMany({})
    ]);

    // Create demo users
    const adminUser = new User({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@autocure.net',
      phone: '+1-905-123-4567',
      password: 'admin123',
      role: 'admin',
      emailVerified: true,
      phoneVerified: true
    });

    const staffUser = new User({
      firstName: 'John',
      lastName: 'Technician',
      email: 'john@autocure.net',
      phone: '+1-905-123-4568',
      password: 'staff123',
      role: 'staff',
      emailVerified: true,
      phoneVerified: true
    });

    const customer1 = new User({
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah@example.com',
      phone: '+1-416-555-0123',
      password: 'customer123',
      role: 'customer',
      emailVerified: true,
      phoneVerified: true,
      address: {
        street: '456 Oak Street',
        city: 'Brampton',
        province: 'ON',
        postalCode: 'L6T 2K8',
        country: 'Canada'
      }
    });

    const customer2 = new User({
      firstName: 'Michael',
      lastName: 'Chen',
      email: 'michael@example.com',
      phone: '+1-416-555-0124',
      password: 'customer123',
      role: 'customer',
      emailVerified: true,
      phoneVerified: true,
      address: {
        street: '789 Pine Avenue',
        city: 'Mississauga',
        province: 'ON',
        postalCode: 'L5B 3M1',
        country: 'Canada'
      }
    });

    await Promise.all([
      adminUser.save(),
      staffUser.save(),
      customer1.save(),
      customer2.save()
    ]);

    console.log('✅ Users created');

    // Create demo services
    const services = [
      {
        name: 'Oil Change & Filter',
        category: 'oil-change',
        description: 'Complete oil change with premium synthetic oil and new filter. Includes 21-point inspection.',
        basePrice: 89.99,
        estimatedDuration: 45,
        isPopular: true,
        parts: [
          { name: 'Synthetic Oil', partNumber: 'OIL-5W30-5L', isRequired: true, estimatedCost: 35 },
          { name: 'Oil Filter', partNumber: 'FILTER-BMW-N55', isRequired: true, estimatedCost: 15 }
        ],
        makes: ['BMW', 'Mercedes-Benz', 'Audi', 'Volkswagen']
      },
      {
        name: 'Brake Pad Replacement',
        category: 'brake-service',
        description: 'Replace front or rear brake pads with OEM quality parts. Includes brake fluid top-up.',
        basePrice: 299.99,
        estimatedDuration: 120,
        isPopular: true,
        parts: [
          { name: 'Brake Pads (Set)', partNumber: 'BRAKE-PAD-FRONT', isRequired: true, estimatedCost: 120 },
          { name: 'Brake Fluid', partNumber: 'FLUID-DOT4', isRequired: false, estimatedCost: 25 }
        ]
      },
      {
        name: 'Engine Diagnostics',
        category: 'engine-diagnostics',
        description: 'Comprehensive computer diagnostic scan using professional Autel equipment. Includes detailed report.',
        basePrice: 149.99,
        estimatedDuration: 60,
        isPopular: true,
        tools: ['Autel MaxiSys Ultra', 'OBD2 Scanner']
      },
      {
        name: 'Transmission Service',
        category: 'transmission',
        description: 'Complete transmission fluid change and filter replacement for automatic transmissions.',
        basePrice: 249.99,
        estimatedDuration: 90,
        parts: [
          { name: 'ATF Fluid', partNumber: 'ATF-DEXRON6', isRequired: true, estimatedCost: 80 },
          { name: 'Transmission Filter', partNumber: 'TRANS-FILTER', isRequired: true, estimatedCost: 45 }
        ]
      },
      {
        name: 'Battery Replacement',
        category: 'battery',
        description: 'Replace vehicle battery with premium AGM battery. Includes battery registration for German vehicles.',
        basePrice: 199.99,
        estimatedDuration: 30,
        isPopular: true,
        parts: [
          { name: 'AGM Battery', partNumber: 'BATTERY-AGM-80AH', isRequired: true, estimatedCost: 150 }
        ]
      }
    ];

    const savedServices = await Service.insertMany(services);
    console.log('✅ Services created');

    // Create demo vehicles
    const vehicle1 = new Vehicle({
      owner: customer1._id,
      vin: '1BMW3SERIES2020A',
      make: 'BMW',
      vehicleModel: '320i',
      year: 2020,
      trim: 'Sport Line',
      engine: '2.0L Turbo',
      transmission: 'automatic',
      fuelType: 'gasoline',
      color: 'Alpine White',
      licensePlate: 'ABC123',
      mileage: 45000,
      lastServiceDate: new Date(Date.now() - 4 * 30 * 24 * 60 * 60 * 1000), // 4 months ago
      serviceHistory: [
        {
          date: new Date(Date.now() - 4 * 30 * 24 * 60 * 60 * 1000),
          mileage: 42000,
          services: ['Oil Change', 'Brake Inspection'],
          cost: 125.50,
          technician: 'John Technician'
        }
      ]
    });

    const vehicle2 = new Vehicle({
      owner: customer2._id,
      vin: '1MERCEDES2019CLASSA',
      make: 'Mercedes-Benz',
      vehicleModel: 'C300',
      year: 2019,
      trim: 'AMG Line',
      engine: '2.0L Turbo',
      transmission: 'automatic',
      fuelType: 'gasoline',
      color: 'Obsidian Black',
      licensePlate: 'XYZ789',
      mileage: 62000,
      lastServiceDate: new Date(Date.now() - 8 * 30 * 24 * 60 * 60 * 1000) // 8 months ago
    });

    await Promise.all([vehicle1.save(), vehicle2.save()]);
    console.log('✅ Vehicles created');

    // Create demo appointments
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const appointment1 = new Appointment({
      customer: customer1._id,
      vehicle: vehicle1._id,
      services: [savedServices[0]._id, savedServices[2]._id], // Oil change + diagnostics
      appointmentDate: tomorrow,
      appointmentTime: '10:00',
      estimatedDuration: 105,
      estimatedCost: 239.98,
      status: 'confirmed',
      customerConcerns: 'Check engine light came on yesterday',
      timeline: [
        {
          timestamp: new Date(),
          status: 'scheduled',
          description: 'Appointment scheduled online'
        },
        {
          timestamp: new Date(),
          status: 'confirmed',
          description: 'Appointment confirmed by staff'
        }
      ]
    });

    const appointment2 = new Appointment({
      customer: customer2._id,
      vehicle: vehicle2._id,
      services: [savedServices[1]._id], // Brake service
      appointmentDate: nextWeek,
      appointmentTime: '14:30',
      estimatedDuration: 120,
      estimatedCost: 299.99,
      status: 'scheduled',
      customerConcerns: 'Squeaking noise when braking',
      timeline: [
        {
          timestamp: new Date(),
          status: 'scheduled',
          description: 'Appointment scheduled via phone'
        }
      ]
    });

    await Promise.all([appointment1.save(), appointment2.save()]);
    console.log('✅ Appointments created');

    console.log('🎉 Demo data seeded successfully!');
    console.log('');
    console.log('Demo Accounts:');
    console.log('👨‍💼 Admin: admin@autocure.net / admin123');
    console.log('🔧 Staff: john@autocure.net / staff123');
    console.log('👤 Customer 1: sarah@example.com / customer123');
    console.log('👤 Customer 2: michael@example.com / customer123');

  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
    throw error;
  }
};

export default seedDemoData;