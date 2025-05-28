import express from 'express';
import { authenticate, authorize } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';
import User from '@/models/User';
import Vehicle from '@/models/Vehicle';
import Appointment from '@/models/Appointment';
import { ApiResponse, DashboardStats } from '@/types';

const router = express.Router();

// Get dashboard statistics
router.get('/stats', authenticate, authorize('staff', 'admin'), asyncHandler(async (req, res) => {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  
  const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const yearStart = new Date(today.getFullYear(), 0, 1);

  // Parallel queries for better performance
  const [
    appointmentsToday,
    appointmentsThisWeek,
    appointmentsThisMonth,
    appointmentsPending,
    appointmentsInProgress,
    appointmentsCompleted,
    totalCustomers,
    newCustomersThisMonth,
    activeCustomers,
    totalVehicles,
    newVehiclesThisMonth,
    vehiclesDueSoon
  ] = await Promise.all([
    Appointment.countDocuments({
      appointmentDate: { $gte: todayStart, $lt: todayEnd }
    }),
    Appointment.countDocuments({
      appointmentDate: { $gte: weekStart, $lt: todayEnd }
    }),
    Appointment.countDocuments({
      appointmentDate: { $gte: monthStart, $lt: todayEnd }
    }),
    Appointment.countDocuments({ status: 'scheduled' }),
    Appointment.countDocuments({ status: 'in-progress' }),
    Appointment.countDocuments({ status: 'completed' }),
    User.countDocuments({ role: 'customer', isActive: true }),
    User.countDocuments({
      role: 'customer',
      isActive: true,
      createdAt: { $gte: monthStart }
    }),
    User.countDocuments({
      role: 'customer',
      isActive: true,
      lastLogin: { $gte: monthStart }
    }),
    Vehicle.countDocuments({ isActive: true }),
    Vehicle.countDocuments({
      isActive: true,
      createdAt: { $gte: monthStart }
    }),
    Vehicle.countDocuments({
      isActive: true,
      nextServiceDue: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
    })
  ]);

  // Calculate revenue (simplified - in reality, you'd have a proper billing system)
  const revenueAggregation = await Appointment.aggregate([
    {
      $match: {
        status: 'completed',
        paymentStatus: 'paid'
      }
    },
    {
      $group: {
        _id: null,
        todayRevenue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gte: ['$appointmentDate', todayStart] },
                  { $lt: ['$appointmentDate', todayEnd] }
                ]
              },
              '$actualCost',
              0
            ]
          }
        },
        weekRevenue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gte: ['$appointmentDate', weekStart] },
                  { $lt: ['$appointmentDate', todayEnd] }
                ]
              },
              '$actualCost',
              0
            ]
          }
        },
        monthRevenue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gte: ['$appointmentDate', monthStart] },
                  { $lt: ['$appointmentDate', todayEnd] }
                ]
              },
              '$actualCost',
              0
            ]
          }
        },
        yearRevenue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gte: ['$appointmentDate', yearStart] },
                  { $lt: ['$appointmentDate', todayEnd] }
                ]
              },
              '$actualCost',
              0
            ]
          }
        }
      }
    }
  ]);

  const revenue = revenueAggregation[0] || {
    todayRevenue: 0,
    weekRevenue: 0,
    monthRevenue: 0,
    yearRevenue: 0
  };

  const stats: DashboardStats = {
    appointments: {
      today: appointmentsToday,
      thisWeek: appointmentsThisWeek,
      thisMonth: appointmentsThisMonth,
      pending: appointmentsPending,
      inProgress: appointmentsInProgress,
      completed: appointmentsCompleted
    },
    revenue: {
      today: revenue.todayRevenue,
      thisWeek: revenue.weekRevenue,
      thisMonth: revenue.monthRevenue,
      thisYear: revenue.yearRevenue
    },
    vehicles: {
      total: totalVehicles,
      newThisMonth: newVehiclesThisMonth,
      dueSoon: vehiclesDueSoon
    },
    customers: {
      total: totalCustomers,
      newThisMonth: newCustomersThisMonth,
      active: activeCustomers
    }
  };

  const response: ApiResponse = {
    success: true,
    message: 'Dashboard statistics retrieved successfully',
    data: { stats }
  };

  res.json(response);
}));

// Get recent appointments
router.get('/recent-appointments', authenticate, authorize('staff', 'admin'), asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 10;

  const appointments = await Appointment.find({})
    .populate('customer', 'firstName lastName email phone')
    .populate('vehicle', 'year make model vin')
    .populate('services', 'name category')
    .sort({ createdAt: -1 })
    .limit(limit);

  const response: ApiResponse = {
    success: true,
    message: 'Recent appointments retrieved successfully',
    data: { appointments }
  };

  res.json(response);
}));

// Get upcoming appointments
router.get('/upcoming-appointments', authenticate, authorize('staff', 'admin'), asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const today = new Date();

  const appointments = await Appointment.find({
    appointmentDate: { $gte: today },
    status: { $in: ['scheduled', 'confirmed'] }
  })
    .populate('customer', 'firstName lastName email phone')
    .populate('vehicle', 'year make model vin')
    .populate('services', 'name category')
    .sort({ appointmentDate: 1, appointmentTime: 1 })
    .limit(limit);

  const response: ApiResponse = {
    success: true,
    message: 'Upcoming appointments retrieved successfully',
    data: { appointments }
  };

  res.json(response);
}));

// Get vehicles due for service
router.get('/vehicles-due', authenticate, authorize('staff', 'admin'), asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 10;

  const vehicles = await Vehicle.find({
    isActive: true,
    $or: [
      { nextServiceDue: { $lte: new Date() } },
      { nextServiceDue: null, lastServiceDate: { $lte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) } }
    ]
  })
    .populate('owner', 'firstName lastName email phone')
    .sort({ nextServiceDue: 1 })
    .limit(limit);

  const response: ApiResponse = {
    success: true,
    message: 'Vehicles due for service retrieved successfully',
    data: { vehicles }
  };

  res.json(response);
}));

// Get appointment analytics
router.get('/analytics/appointments', authenticate, authorize('staff', 'admin'), asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days as string) || 30;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const analytics = await Appointment.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$appointmentDate' } },
          status: '$status'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        data: {
          $push: {
            status: '$_id.status',
            count: '$count'
          }
        },
        total: { $sum: '$count' }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  const response: ApiResponse = {
    success: true,
    message: 'Appointment analytics retrieved successfully',
    data: { analytics, period: `${days} days` }
  };

  res.json(response);
}));

// Get service popularity analytics
router.get('/analytics/services', authenticate, authorize('staff', 'admin'), asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days as string) || 30;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const serviceAnalytics = await Appointment.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        status: { $in: ['completed', 'in-progress'] }
      }
    },
    {
      $unwind: '$services'
    },
    {
      $lookup: {
        from: 'services',
        localField: 'services',
        foreignField: '_id',
        as: 'serviceInfo'
      }
    },
    {
      $unwind: '$serviceInfo'
    },
    {
      $group: {
        _id: {
          serviceId: '$services',
          serviceName: '$serviceInfo.name',
          category: '$serviceInfo.category'
        },
        count: { $sum: 1 },
        revenue: { $sum: '$serviceInfo.basePrice' }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: 10
    }
  ]);

  const response: ApiResponse = {
    success: true,
    message: 'Service analytics retrieved successfully',
    data: { serviceAnalytics, period: `${days} days` }
  };

  res.json(response);
}));

// Get customer analytics
router.get('/analytics/customers', authenticate, authorize('staff', 'admin'), asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days as string) || 30;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [newCustomers, returningCustomers, totalRevenue] = await Promise.all([
    User.aggregate([
      {
        $match: {
          role: 'customer',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]),
    Appointment.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $lookup: {
          from: 'appointments',
          let: { customerId: '$customer' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$customer', '$$customerId'] },
                createdAt: { $lt: startDate }
              }
            }
          ],
          as: 'previousAppointments'
        }
      },
      {
        $match: {
          'previousAppointments.0': { $exists: true }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]),
    Appointment.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: 'completed',
          paymentStatus: 'paid'
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$actualCost' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ])
  ]);

  const response: ApiResponse = {
    success: true,
    message: 'Customer analytics retrieved successfully',
    data: {
      newCustomers,
      returningCustomers,
      totalRevenue,
      period: `${days} days`
    }
  };

  res.json(response);
}));

export default router;