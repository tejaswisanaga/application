# Service Booking API

A comprehensive REST API for a service booking application that connects customers with technicians for various home and professional services. Built with Node.js, Express, and MongoDB.

## Features

- **User Management**: Customer and technician registration/authentication
- **Service Management**: Browse and search available services
- **Booking System**: Schedule and manage service appointments
- **Payment Processing**: Handle payments and refunds
- **Dashboard**: Role-based dashboards for customers and technicians
- **Reviews and Ratings**: Customer feedback system
- **MongoDB Integration**: All data stored in MongoDB database

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (customer/technician)
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/me` - Update user profile
- `POST /api/auth/change-password` - Change password

### Users
- `GET /api/users/dashboard` - Get dashboard data
- `GET /api/users/profile/:id` - Get user profile
- `GET /api/users/technicians` - Get all verified technicians
- `GET /api/users/search` - Search users

### Services
- `GET /api/services` - Get all services with filtering
- `GET /api/services/:id` - Get single service
- `POST /api/services` - Create service (admin only)
- `PUT /api/services/:id` - Update service (admin only)
- `DELETE /api/services/:id` - Delete service (admin only)
- `GET /api/services/categories` - Get all categories
- `GET /api/services/featured` - Get featured services
- `GET /api/services/search` - Search services

### Bookings
- `POST /api/bookings` - Create new booking (customer only)
- `GET /api/bookings` - Get user's bookings
- `GET /api/bookings/:id` - Get single booking
- `PUT /api/bookings/:id/status` - Update booking status
- `PUT /api/bookings/:id/reschedule` - Reschedule booking
- `POST /api/bookings/:id/review` - Add review (customer only)

### Payments
- `POST /api/payments` - Create payment (customer only)
- `POST /api/payments/:id/confirm` - Confirm payment (admin only)
- `POST /api/payments/:id/fail` - Mark payment as failed (admin only)
- `POST /api/payments/:id/refund` - Process refund (admin only)
- `GET /api/payments` - Get user's payments
- `GET /api/payments/:id` - Get single payment
- `GET /api/payments/stats` - Get payment statistics

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start MongoDB server

5. Run the application:
```bash
npm run dev
# or
npm start
```

## Environment Variables

- `PORT` - Server port (default: 5000)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT secret key
- `NODE_ENV` - Environment (development/production)

## Database Models

### User
- Customer and technician profiles
- Authentication and authorization
- Skills and availability for technicians
- Ratings and reviews

### Service
- Service catalog with categories
- Pricing and duration
- Required skills and tools

### Booking
- Appointment scheduling
- Status tracking
- Reviews and ratings

### Payment
- Transaction management
- Fee calculation
- Refund processing

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Error Handling

The API returns standard HTTP status codes and error messages in JSON format:

```json
{
  "message": "Error description",
  "errors": [] // Validation errors (if any)
}
```

## Rate Limiting

API endpoints are rate-limited to prevent abuse:
- 100 requests per 15 minutes per IP

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Input validation and sanitization
- CORS protection
- Helmet.js for security headers
- Rate limiting

## Example Usage

### Register a new customer
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "password123",
    "phone": "1234567890",
    "role": "customer",
    "address": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001"
    }
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123",
    "role": "customer"
  }'
```

### Create a booking
```bash
curl -X POST http://localhost:5000/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_token>" \
  -d '{
    "service": "service_id",
    "technician": "technician_id",
    "scheduledDate": "2024-01-15",
    "scheduledTime": "10:00",
    "duration": 2,
    "serviceAddress": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001"
    }
  }'
```

## License

MIT License
