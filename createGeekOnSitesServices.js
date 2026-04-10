const mongoose = require('mongoose');
const Service = require('../models/Service');
const User = require('../models/User');
require('dotenv').config();

// GeekOnSites specific services
const geekOnSitesServices = [
  {
    name: 'Laptop Repair & Maintenance',
    description: 'Complete laptop repair services including hardware fixes, software troubleshooting, and performance optimization',
    category: 'laptop_computer',
    basePrice: 120,
    estimatedDuration: 2,
    difficulty: 'medium',
    requiredSkills: ['Hardware Repair', 'Software Troubleshooting', 'Diagnostics'],
    toolsRequired: ['Screwdriver set', 'Anti-static wrist strap', 'Diagnostic software'],
    tags: ['laptop', 'repair', 'hardware', 'software', 'maintenance'],
    isActive: true
  },
  {
    name: 'Computer Setup & Configuration',
    description: 'Professional computer setup, OS installation, and configuration for home and office use',
    category: 'laptop_computer',
    basePrice: 100,
    estimatedDuration: 1.5,
    difficulty: 'easy',
    requiredSkills: ['System Configuration', 'Software Installation'],
    toolsRequired: ['Installation media', 'Configuration tools'],
    tags: ['setup', 'configuration', 'installation', 'computer'],
    isActive: true
  },
  {
    name: 'Network Installation & Setup',
    description: 'Complete network setup including router configuration, WiFi optimization, and network security',
    category: 'network_wifi',
    basePrice: 150,
    estimatedDuration: 2.5,
    difficulty: 'medium',
    requiredSkills: ['Network Configuration', 'Router Setup', 'Security'],
    toolsRequired: ['Network cable tester', 'Router configuration tools', 'Security software'],
    tags: ['network', 'wifi', 'router', 'security', 'setup'],
    isActive: true
  },
  {
    name: 'WiFi Troubleshooting & Optimization',
    description: 'Diagnose and fix WiFi connectivity issues, optimize network performance and coverage',
    category: 'network_wifi',
    basePrice: 80,
    estimatedDuration: 1.5,
    difficulty: 'easy',
    requiredSkills: ['WiFi Troubleshooting', 'Network Analysis'],
    toolsRequired: ['WiFi analyzer', 'Network testing tools'],
    tags: ['wifi', 'troubleshooting', 'optimization', 'coverage'],
    isActive: true
  },
  {
    name: 'CCTV Installation & Configuration',
    description: 'Professional CCTV camera installation, setup, and configuration for home and business security',
    category: 'cctv_security',
    basePrice: 200,
    estimatedDuration: 3,
    difficulty: 'hard',
    requiredSkills: ['Camera Installation', 'Cable Management', 'Security Setup'],
    toolsRequired: ['CCTV cameras', 'Cables', 'Monitor', 'DVR/NVR system'],
    tags: ['cctv', 'security', 'cameras', 'surveillance', 'installation'],
    isActive: true
  },
  {
    name: 'Security System Setup',
    description: 'Complete security system installation including alarms, sensors, and monitoring setup',
    category: 'cctv_security',
    basePrice: 250,
    estimatedDuration: 4,
    difficulty: 'hard',
    requiredSkills: ['Security Systems', 'Alarm Installation', 'Sensor Configuration'],
    toolsRequired: ['Security panel', 'Sensors', 'Alarm system', 'Testing tools'],
    tags: ['security', 'alarm', 'sensors', 'monitoring', 'protection'],
    isActive: true
  },
  {
    name: 'Software Installation & Support',
    description: 'Professional software installation, configuration, and ongoing support for various applications',
    category: 'software_solutions',
    basePrice: 90,
    estimatedDuration: 1.5,
    difficulty: 'easy',
    requiredSkills: ['Software Installation', 'Configuration', 'Troubleshooting'],
    toolsRequired: ['Software licenses', 'Installation tools', 'Support documentation'],
    tags: ['software', 'installation', 'support', 'configuration', 'troubleshooting'],
    isActive: true
  },
  {
    name: 'Custom Software Development',
    description: 'Bespoke software development solutions tailored to your business needs',
    category: 'software_solutions',
    basePrice: 500,
    estimatedDuration: 8,
    difficulty: 'hard',
    requiredSkills: ['Programming', 'Database Design', 'System Architecture'],
    toolsRequired: ['Development environment', 'Version control', 'Testing tools'],
    tags: ['development', 'custom', 'programming', 'bespoke', 'business'],
    isActive: true
  },
  {
    name: 'Business IT Support',
    description: 'Comprehensive IT support services for businesses including helpdesk and system maintenance',
    category: 'business_it',
    basePrice: 180,
    estimatedDuration: 2,
    difficulty: 'medium',
    requiredSkills: ['IT Support', 'System Administration', 'Helpdesk'],
    toolsRequired: ['Remote support tools', 'Diagnostic software', 'Admin tools'],
    tags: ['business', 'support', 'helpdesk', 'maintenance', 'corporate'],
    isActive: true
  },
  {
    name: 'Server Setup & Maintenance',
    description: 'Professional server installation, configuration, and ongoing maintenance services',
    category: 'business_it',
    basePrice: 300,
    estimatedDuration: 4,
    difficulty: 'hard',
    requiredSkills: ['Server Administration', 'Network Configuration', 'Security'],
    toolsRequired: ['Server hardware', 'Administration tools', 'Monitoring software'],
    tags: ['server', 'administration', 'maintenance', 'business', 'enterprise'],
    isActive: true
  },
  {
    name: 'Smart Home Installation',
    description: 'Complete smart home setup including devices, automation, and integration',
    category: 'smart_home',
    basePrice: 220,
    estimatedDuration: 3,
    difficulty: 'medium',
    requiredSkills: ['Smart Home Setup', 'Device Integration', 'Automation'],
    toolsRequired: ['Smart devices', 'Hub/controller', 'Configuration tools'],
    tags: ['smart home', 'automation', 'iot', 'integration', 'devices'],
    isActive: true
  },
  {
    name: 'Home Automation Configuration',
    description: 'Configure and optimize home automation systems for maximum convenience and efficiency',
    category: 'smart_home',
    basePrice: 130,
    estimatedDuration: 2,
    difficulty: 'medium',
    requiredSkills: ['Automation Setup', 'Device Programming', 'Integration'],
    toolsRequired: ['Automation software', 'Programming tools', 'Testing devices'],
    tags: ['automation', 'programming', 'configuration', 'smart home', 'iot'],
    isActive: true
  },
  {
    name: 'Appliance Repair & Maintenance',
    description: 'Professional repair and maintenance services for home appliances and smart devices',
    category: 'appliances',
    basePrice: 110,
    estimatedDuration: 2,
    difficulty: 'medium',
    requiredSkills: ['Appliance Repair', 'Electronics', 'Diagnostics'],
    toolsRequired: ['Repair tools', 'Testing equipment', 'Replacement parts'],
    tags: ['appliances', 'repair', 'maintenance', 'electronics', 'home'],
    isActive: true
  },
  {
    name: 'Smart Appliance Setup',
    description: 'Installation and configuration of smart appliances and integration with home systems',
    category: 'appliances',
    basePrice: 95,
    estimatedDuration: 1.5,
    difficulty: 'easy',
    requiredSkills: ['Smart Device Setup', 'Configuration', 'Integration'],
    toolsRequired: ['Smart appliances', 'Configuration tools', 'Network setup'],
    tags: ['smart appliances', 'setup', 'configuration', 'integration', 'iot'],
    isActive: true
  }
];

// Technician skills for each category
const technicianSkills = {
  laptop_computer: ['Hardware Repair', 'Software Troubleshooting', 'Diagnostics', 'System Configuration', 'OS Installation'],
  network_wifi: ['Network Configuration', 'Router Setup', 'Security', 'WiFi Troubleshooting', 'Network Analysis'],
  cctv_security: ['Camera Installation', 'Cable Management', 'Security Setup', 'Alarm Installation', 'Surveillance'],
  software_solutions: ['Software Installation', 'Configuration', 'Programming', 'Database Design', 'System Architecture'],
  business_it: ['IT Support', 'System Administration', 'Helpdesk', 'Server Administration', 'Network Configuration'],
  smart_home: ['Smart Home Setup', 'Device Integration', 'Automation', 'IoT Configuration', 'Programming'],
  appliances: ['Appliance Repair', 'Electronics', 'Diagnostics', 'Smart Device Setup', 'Maintenance']
};

async function createGeekOnSitesData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing services
    await Service.deleteMany({});
    console.log('Cleared existing services');

    // Insert GeekOnSites services
    const services = await Service.insertMany(geekOnSitesServices);
    console.log(`Created ${services.length} GeekOnSites services`);

    // Update existing technicians with relevant skills
    const technicians = await User.find({ role: 'technician' });
    
    for (let technician of technicians) {
      // Assign skills based on what categories exist
      const allSkills = Object.values(technicianSkills).flat();
      const randomSkills = allSkills.sort(() => 0.5 - Math.random()).slice(0, 4);
      
      technician.skills = randomSkills;
      technician.isVerified = true;
      await technician.save();
    }

    console.log(`Updated ${technicians.length} technicians with relevant skills`);

    // Display created services
    console.log('\n=== GeekOnSites Services Created ===');
    services.forEach((service, index) => {
      console.log(`${index + 1}. ${service.name} - $${service.basePrice} (${service.category})`);
    });

    console.log('\n=== Service Categories ===');
    const categories = [...new Set(services.map(s => s.category))];
    categories.forEach(category => {
      console.log(`- ${category}`);
    });

    console.log('\nGeekOnSites data setup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createGeekOnSitesData();
