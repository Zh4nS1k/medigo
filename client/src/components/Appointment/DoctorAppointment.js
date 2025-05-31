import React, { useEffect, useState } from 'react';
import styles from './Appointment.module.css';
import ErrorDialogueBox from '../MUIDialogueBox/ErrorDialogueBox';
import Box from '@mui/material/Box';
import MyCalendar from '../Datepicker/MyCalendar';
import moment from 'moment';
import axios from 'axios';
import {
  BootstrapDialog,
  BootstrapDialogTitle,
} from '../MUIDialogueBox/BoostrapDialogueBox';
import DialogContent from '@mui/material/DialogContent';
import AppointmentForm from '../Forms/AppointmentForm';
import DoctorAppointmentTable from '../MUITable/DoctorAppointmentTable';

function DoctorAppointment() {
  // State management
  const [clickedTimeSlot, setClickedTimeSlot] = useState('');
  const [date, setDate] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [bookedAppointments, setBookedAppointments] = useState([]);
  const [departmentList, setDepartmentList] = useState([]);
  const [doctorList, setDoctorList] = useState([]);
  const [patientList, setPatientList] = useState([]);
  const [departmentSelected, setDepartmentSelected] = useState('');
  const [doctorSelected, setDoctorSelected] = useState(
    localStorage.getItem('userId') || ''
  );
  const [errorDialogueBoxOpen, setErrorDialogueBoxOpen] = useState(false);
  const [errorList, setErrorList] = useState([]);
  const [openDialgueBox, setOpenDialgueBox] = useState(false);

  // Helper functions
  const getformDate = (mydate) => {
    const parts = mydate.split('-');
    return new Date(+parts[0], parts[1] - 1, +parts[2], 12);
  };

  const formatDateForDateInput = (dateObj) => {
    return moment(dateObj).format('YYYY-MM-DD');
  };

  // Event handlers
  const handleDepartmentChange = (event) => {
    setDepartmentSelected(event.target.value);
    setDoctorSelected(localStorage.getItem('userId'));
  };

  const handleDoctorChange = (event) => {
    setDoctorSelected(event.target.value);
  };

  const handleErrorDialogueOpen = () => {
    setErrorDialogueBoxOpen(true);
  };

  const handleErrorDialogueClose = () => {
    setErrorList([]);
    setErrorDialogueBoxOpen(false);
  };

  const handleClickOpen = () => {
    setOpenDialgueBox(true);
  };

  const handleClose = () => {
    setOpenDialgueBox(false);
  };

  const slotClicked = (slot) => {
    setClickedTimeSlot(slot);
    handleClickOpen();
  };

  // API functions
  const addAppointmentFormSubmitted = async (event) => {
    event.preventDefault();
    const form = document.forms.addAppointment;
    let reqObj = {
      appDate: form.appDate.value,
      appTime: form.appTime.value,
      doctorId: form.doctor.value,
      patientId: form.patient.value,
    };

    try {
      let response = await axios.put(
        `http://localhost:3001/appointments/`,
        reqObj,
        {
          headers: {
            authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      if (response.data.message === 'success') {
        getAvailableSlots();
        getBookedSlots();
        handleClose();
      }
    } catch (error) {
      setErrorList(
        error.response?.data?.errors || ['Failed to book appointment']
      );
      handleErrorDialogueOpen();
    }
  };

  const getAvailableSlots = async () => {
    if (!doctorSelected) return;

    try {
      let response = await axios.post(
        `http://localhost:3001/appointments`,
        {
          isTimeSlotAvailable: true,
          appDate: formatDateForDateInput(date),
          doctorID: doctorSelected,
        },
        {
          headers: {
            authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      if (response.data.message === 'success') {
        let slots = response.data.appointments
          .map((apt) => apt.appointmentTime)
          .sort((a, b) => {
            const timeA = new Date(`01/01/2000 ${a}`);
            const timeB = new Date(`01/01/2000 ${b}`);
            return timeA - timeB;
          });
        setAvailableSlots(slots);
      }
    } catch (error) {
      console.error('Error fetching available slots:', error);
    }
  };

  const getBookedSlots = async () => {
    if (!doctorSelected) return;

    try {
      let response = await axios.post(
        `http://localhost:3001/appointments`,
        {
          isTimeSlotAvailable: false,
          appDate: formatDateForDateInput(date),
          doctorID: doctorSelected,
        },
        {
          headers: {
            authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      if (response.data.message === 'success') {
        let aptms = response.data.appointments.sort((a, b) => {
          const timeA = new Date(`01/01/2000 ${a.appointmentTime}`);
          const timeB = new Date(`01/01/2000 ${b.appointmentTime}`);
          return timeA - timeB;
        });

        setBookedAppointments(aptms);
        setBookedSlots(aptms.map((apt) => apt.appointmentTime));
      }
    } catch (error) {
      console.error('Error fetching booked slots:', error);
    }
  };

  const deleteBookedSlots = async (appId) => {
    try {
      let response = await axios.delete(`http://localhost:3001/appointments/`, {
        headers: {
          authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        data: {
          appointmentId: appId,
        },
      });
      if (response.data.message === 'success') {
        getAvailableSlots();
        getBookedSlots();
      }
    } catch (error) {
      setErrorList(
        error.response?.data?.errors || ['Failed to delete appointment']
      );
      handleErrorDialogueOpen();
    }
  };

  const getDoctorList = async () => {
    try {
      let response = await axios.get(`http://localhost:3001/doctors`, {
        headers: {
          authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      let doctors = response.data;
      if (departmentSelected) {
        doctors = doctors.filter(
          (doc) => doc.department === departmentSelected
        );
      }
      setDoctorList(doctors);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const getDepartmentList = async () => {
    try {
      let response = await axios.get(`http://localhost:3001/departments`, {
        headers: {
          authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setDepartmentList(response.data.departments || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const getPatients = async () => {
    try {
      const response = await axios.get('http://localhost:3001/patients');
      setPatientList(response.data);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const handleCreateSlotSubmit = async (event) => {
    event.preventDefault();
    const form = document.forms.createSlotForm;
    const timeSlots = Array.from(
      form.querySelectorAll('input[type="checkbox"]:checked')
    ).map((input) => input.value);

    // Validate inputs
    const errors = [];
    if (!timeSlots.length) errors.push('Please choose at least one time slot');
    if (!date) errors.push('Please select a date');
    if (!doctorSelected) errors.push('Please select a doctor');

    if (errors.length) {
      setErrorList(errors);
      handleErrorDialogueOpen();
      return;
    }

    try {
      const response = await axios.post(
        `http://localhost:3001/appointments/add`,
        {
          appDate: formatDateForDateInput(date),
          timeSlots: timeSlots,
          doctorID: doctorSelected,
        },
        {
          headers: {
            authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      if (response.data.message === 'success') {
        getAvailableSlots();
        getBookedSlots();
        form
          .querySelectorAll('input[type="checkbox"]')
          .forEach((input) => (input.checked = false));
      }
    } catch (error) {
      setErrorList(
        error.response?.data?.errors || ['Failed to create time slots']
      );
      handleErrorDialogueOpen();
    }
  };

  // Effects
  useEffect(() => {
    getDepartmentList();
    getPatients();
  }, []);

  useEffect(() => {
    getDoctorList();
  }, [departmentSelected]);

  useEffect(() => {
    if (doctorSelected) {
      getAvailableSlots();
      getBookedSlots();
    }
  }, [date, doctorSelected]);

  return (
    <Box
      id={styles.appointmentMain}
      component="main"
      sx={{ flexGrow: 1, p: 3 }}
    >
      <div>
        <h3 className={styles.pageTitle}> Appointments</h3>
      </div>

      <div id={styles.slotGrid}>
        <div id={styles.calendarDiv}>
          <MyCalendar date={date} setDate={setDate} />
        </div>
        <div id={styles.slotCreationDiv}>
          <form
            name="createSlotForm"
            id="createSlotForm"
            onSubmit={handleCreateSlotSubmit}
          >
            <h4>Choose Doctor and Date</h4>
            <div className="my-4 row">
              <div className="col-12">
                <label htmlFor="department" className="col-sm-3 col-form-label">
                  Department:{' '}
                </label>
                <select
                  name="department"
                  id="department"
                  className="col-form-select col-sm-7"
                  value={departmentSelected}
                  onChange={handleDepartmentChange}
                >
                  <option value="">All Departments</option>
                  {departmentList.map((dept, index) => (
                    <option key={index} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="my-4 row">
              <div className="col-12">
                <label htmlFor="doctor" className="col-sm-3 col-form-label">
                  Doctor:{' '}
                </label>
                <select
                  name="doctor"
                  id="doctor"
                  className="col-form-select col-sm-7"
                  value={doctorSelected}
                  onChange={handleDoctorChange}
                  required
                >
                  <option value="">Choose Doctor</option>
                  {doctorList.map((doctor) => (
                    <option key={doctor._id} value={doctor._id}>
                      {doctor.userId.firstName} {doctor.userId.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="my-4 row">
              <div className="col-12">
                <label htmlFor="appDate" className="col-sm-3 col-form-label">
                  Date:{' '}
                </label>
                <input
                  id="appDate"
                  name="appDate"
                  type="date"
                  className="col-form-control col-sm-7"
                  value={formatDateForDateInput(date)}
                  onChange={(e) => setDate(getformDate(e.target.value))}
                  required
                />
              </div>
            </div>
            <h4>Create Slots</h4>
            <div className="my-4 row">
              <label htmlFor="appTime" className="col-sm-3 col-form-label">
                Time slots:{' '}
              </label>
              <span className="col-sm-9">
                {[
                  '9:00 AM',
                  '9:30 AM',
                  '10:00 AM',
                  '10:30 AM',
                  '11:00 AM',
                  '11:30 AM',
                  '12:00 PM',
                  '1:00 PM',
                  '1:30 PM',
                  '2:00 PM',
                  '2:30 PM',
                ].map(
                  (slot) =>
                    !availableSlots.includes(slot) &&
                    !bookedSlots.includes(slot) && (
                      <div
                        key={slot}
                        className="form-check form-check-inline px-3 py-1"
                      >
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={slot}
                          value={slot}
                        />
                        <label className="form-check-label" htmlFor={slot}>
                          {slot}
                        </label>
                      </div>
                    )
                )}
              </span>
            </div>
            <button
              type="submit"
              className="btn btn-primary float-right btn-rounded py-2 px-4"
            >
              Create Slots
            </button>
          </form>
        </div>
      </div>

      {availableSlots.length > 0 && (
        <div className={styles.availableSlotsHeader}>
          <h4 className="mt-5">Available Slots</h4>
          <p>Click a slot to book appointments</p>
          <div className="d-flex flex-wrap">
            {availableSlots.map((slot) => (
              <div
                key={slot}
                onClick={() => slotClicked(slot)}
                className={styles.slotCard}
              >
                {slot}
              </div>
            ))}
          </div>
        </div>
      )}

      {bookedAppointments.length > 0 && (
        <div className={styles.availableSlotsHeader}>
          <h4 className="mt-5">Booked Appointments</h4>
          <DoctorAppointmentTable
            bookedAppointments={bookedAppointments}
            deleteBookedSlots={deleteBookedSlots}
            doctorList={doctorList}
            patientList={patientList}
            availableSlots={availableSlots}
            getAvailableSlots={getAvailableSlots}
            getBookedSlots={getBookedSlots}
          />
        </div>
      )}

      <ErrorDialogueBox
        open={errorDialogueBoxOpen}
        handleToClose={handleErrorDialogueClose}
        ErrorTitle="Error"
        ErrorList={errorList}
      />

      <BootstrapDialog
        onClose={handleClose}
        aria-labelledby="customized-dialog-title"
        open={openDialgueBox}
      >
        <BootstrapDialogTitle
          id="customized-dialog-title"
          onClose={handleClose}
        >
          Book Appointment
        </BootstrapDialogTitle>
        <DialogContent dividers>
          <AppointmentForm
            formName="addAppointment"
            formOnSubmit={addAppointmentFormSubmitted}
            appDate={formatDateForDateInput(date)}
            appTime={clickedTimeSlot}
            doctorList={doctorList}
            doctorSelected={doctorSelected}
            patientList={patientList}
            availableSlots={availableSlots}
          />
        </DialogContent>
      </BootstrapDialog>
    </Box>
  );
}

export default DoctorAppointment;
