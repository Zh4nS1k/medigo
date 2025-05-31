const Appointment = require('../models/appointment.js');
const Doctor = require('../models/doctor.js');
const Patient = require('../models/patient.js');
const mongoose = require('mongoose');

const getDepartments = async (req, res) => {
  try {
    let departmentList = await Doctor.distinct('department');
    res.json({ message: 'success', departments: departmentList });
  } catch (error) {
    res.status(500).json({ errors: [error.message] });
  }
};

const getAppointments = async (req, res) => {
  try {
    // console.log("appDate",req.body.appDate)
    let isTimeSlotAvailable = req.body.isTimeSlotAvailable;
    let appointmentDate = req.body.appDate
      ? new Date(req.body.appDate).toISOString().slice(0, 10)
      : null;
    let docID = req.body.doctorID;
    let appointments = [];
    if (isTimeSlotAvailable) {
      if (docID) {
        appointments = await Appointment.find({
          isTimeSlotAvailable: isTimeSlotAvailable,
          appointmentDate: appointmentDate,
          doctorId: mongoose.Types.ObjectId(docID),
        });
      } else if (req.sender.userType == 'Doctor') {
        appointments = await Appointment.find({
          isTimeSlotAvailable: isTimeSlotAvailable,
          appointmentDate: appointmentDate,
          doctorId: req.sender.doctorId,
        })
          .populate({
            path: 'doctorId',
            populate: {
              path: 'userId',
            },
          })
          .populate({
            path: 'patientId',
            populate: {
              path: 'userId',
            },
          });
      }
    } else if (isTimeSlotAvailable == false) {
      // console.log("here 2")
      if (req.sender.userType == 'Admin' || req.sender.userType == 'Doctor') {
        let query = {
          isTimeSlotAvailable: false,
          appointmentDate: appointmentDate,
          completed: false,
        };
        if (docID) {
          query.doctorId = mongoose.Types.ObjectId(docID);
        }
        // appointments = await Appointment.find(query).lean();
        appointments = await Appointment.find(query)
          .populate({
            path: 'doctorId',
            populate: {
              path: 'userId',
            },
          })
          .populate({
            path: 'patientId',
            populate: {
              path: 'userId',
            },
          });
      } else if (req.sender.userType == 'Patient') {
        console.log('patientId', req.sender.patientId);
        let query = {
          isTimeSlotAvailable: false,
          completed: false,
          patientId: req.sender.patientId,
        };
        if (docID) {
          query.doctorId = mongoose.Types.ObjectId(docID);
        }
        if (appointmentDate) {
          query.appointmentDate = appointmentDate;
        }
        appointments = await Appointment.find(query)
          .populate({
            path: 'doctorId',
            populate: {
              path: 'userId',
            },
          })
          .populate({
            path: 'patientId',
            populate: {
              path: 'userId',
            },
          });
      } else if (req.sender.userType == 'Doctor') {
        appointments = await Appointment.find({
          isTimeSlotAvailable: false,
          completed: false,
          appointmentDate: appointmentDate,
          doctorId: req.sender.doctorId,
        })
          .populate({
            path: 'doctorId',
            populate: {
              path: 'userId',
            },
          })
          .populate({
            path: 'patientId',
            populate: {
              path: 'userId',
            },
          });
      }
      // console.log(appointments)
    }
    // console.log("appointmentDate",appointmentDate);
    // console.log("docID",docID);
    // console.log("isTimeSlotAvailable",isTimeSlotAvailable);
    // console.log("appointments",appointments);
    res.json({ message: 'success', appointments: appointments });
  } catch (error) {
    res.status(500).json({ errors: [error.message] });
  }
};

const createAppointmentSlot = async (req, res) => {
  try {
    const rawDate = req.body.appDate;
    const docID = req.body.doctorID;
    const timeSlots = req.body.timeSlots;

    // Валидация входных данных
    if (
      !rawDate ||
      !docID ||
      !Array.isArray(timeSlots) ||
      timeSlots.length === 0
    ) {
      return res.status(400).json({
        errors: ['Missing or invalid appDate, doctorID, or timeSlots'],
      });
    }

    if (!mongoose.Types.ObjectId.isValid(docID)) {
      return res.status(400).json({ errors: ['Invalid doctorID'] });
    }

    const appDate = new Date(rawDate).toISOString().slice(0, 10);
    const docObjectId = mongoose.Types.ObjectId(docID);

    console.log('Creating appointment slots for:', {
      appDate,
      doctorID: docID,
      timeSlots,
    });

    for (const slot of timeSlots) {
      await Appointment.updateOne(
        {
          appointmentDate: appDate,
          appointmentTime: slot,
          doctorId: docObjectId,
        },
        {
          $setOnInsert: {
            appointmentDate: appDate,
            appointmentTime: slot,
            doctorId: docObjectId,
            isTimeSlotAvailable: true,
          },
        },
        { upsert: true }
      );
    }

    res.json({ message: 'success' });
  } catch (error) {
    console.error('createAppointmentSlot error:', error);
    res.status(500).json({ errors: [error.message] });
  }
};

const bookAppointment = async (req, res) => {
  try {
    let appointment = await Appointment.findOneAndUpdate(
      {
        isTimeSlotAvailable: true,
        appointmentDate: req.body.appDate,
        appointmentTime: req.body.appTime,
        doctorId: mongoose.Types.ObjectId(req.body.doctorId),
      },
      {
        isTimeSlotAvailable: false,
        patientId: mongoose.Types.ObjectId(req.body.patientId),
      }
    );
    // console.log("appointment",appointment);
    if (appointment) {
      res.json({ message: 'success' });
    } else {
      res
        .status(404)
        .json({ errors: ['Could not book appointment. Please Try again.'] });
    }
  } catch (error) {
    res.status(404).json({ errors: [error.message] });
  }
};

const deleteAppointment = async (req, res) => {
  // console.log("delete appointment")
  try {
    let appointment = await Appointment.findByIdAndDelete(
      req.body.appointmentId
    );
    if (appointment) {
      res.json({ message: 'success' });
    } else {
      res.status(404).json({ errors: ['Could not delete appointment'] });
    }
  } catch (error) {
    res.status(404).json({ errors: [error.message] });
  }
};
const getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id).lean();
    appointment.doctorDetails = await Doctor.findById(appointment.doctorId);
    appointment.patientDetails = await Patient.findById(appointment.patientId);
    res.json({ message: 'success', appointment: appointment });
  } catch (error) {
    res.status(404).json({ errors: [error.message] });
  }
};

const updateAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(req.params.id, {
      isTimeSlotAvailable: false,
      appointmentDate: req.body.appDate,
      appointmentTime: req.body.appTime,
      doctorId: mongoose.Types.ObjectId(req.body.doctorId),
      patientId: mongoose.Types.ObjectId(req.body.patientId),
    });
    if (appointment) {
      const openSlot = await Appointment.findOneAndDelete({
        isTimeSlotAvailable: true,
        appointmentDate: req.body.appDate,
        appointmentTime: req.body.appTime,
      });
      res.json({ message: 'success' });
    }
  } catch (error) {
    res.status(404).json({ errors: [error.message] });
  }
};

module.exports = {
  getDepartments,
  getAppointments,
  getAppointmentById,
  createAppointmentSlot,
  bookAppointment,
  deleteAppointment,
  updateAppointmentById,
};
