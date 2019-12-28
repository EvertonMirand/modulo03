import { isBefore, subHours } from 'date-fns';

import User from '../models/User';
import Appointment from '../models/Appointment';

import Queue from '../../lib/Queue';
import CancellationMail from '../jobs/CancellationMail';

class CancelAppointmentService {
  async run({ provider_id, date, user_id }) {
    const appointment = await Appointment.findByPk(provider_id, {
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['name', 'email'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['name'],
        },
      ],
    });

    if (appointment.user_id !== user_id) {
      throw new Error("You don't have permission to cancel this appointment");
    }

    const dateWithSub = subHours(appointment.date, 2);

    if (isBefore(dateWithSub, new Date())) {
      throw new Error("You don't have permission to cancel this appointment");
    }

    appointment.canceled_at = new Date();

    await appointment.save();

    await Queue.add(CancellationMail.key, {
      appointment,
    });

    return appointment;
  }
}

export default new CancelAppointmentService();