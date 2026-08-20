import Joi from 'joi';

export const authSchemas = {
  register: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Invalid email format',
      'any.required': 'Email is required',
    }),
    password: Joi.string().min(8).required().messages({
      'string.min': 'Password must be at least 8 characters',
      'any.required': 'Password is required',
    }),
    full_name: Joi.string().required().messages({
      'any.required': 'Full name is required',
    }),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
    role: Joi.string().valid('resident', 'manager', 'provider', 'worker').required(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
};

export const communitySchemas = {
  create: Joi.object({
    name: Joi.string().required(),
    location: Joi.string().required(),
    country: Joi.string().default('KE'),
    currency: Joi.string().default('KES'),
  }),

  update: Joi.object({
    name: Joi.string().optional(),
    location: Joi.string().optional(),
  }),
};

export const orderSchemas = {
  create: Joi.object({
    service_id: Joi.string().uuid().required(),
    provider_id: Joi.string().uuid().required(),
    quantity: Joi.number().positive().required(),
    delivery_location: Joi.string().required(),
    delivery_latitude: Joi.number().min(-90).max(90).optional(),
    delivery_longitude: Joi.number().min(-180).max(180).optional(),
    scheduled_time: Joi.date().iso().optional(),
  }),
};

export const incidentSchemas = {
  report: Joi.object({
    service_id: Joi.string().uuid().required(),
    title: Joi.string().required(),
    description: Joi.string().required(),
    severity: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
    unit_id: Joi.string().uuid().optional(),
    location: Joi.string().optional(),
  }),
};

export function validateSchema(schema, data) {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const messages = error.details.reduce((acc, err) => {
      acc[err.path.join('.')] = err.message;
      return acc;
    }, {});
    const validationError = new Error('Validation failed');
    validationError.statusCode = 400;
    validationError.details = messages;
    throw validationError;
  }

  return value;
}
