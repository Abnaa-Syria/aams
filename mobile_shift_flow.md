# Mobile Shift Flow Hand-off Document

This document outlines the step-by-step mobile screen transitions and corresponding API calls for the driver's shift start-to-end lifecycle.

## Mobile Screens & API Sequence Flow

![Driver Shift Flow UI Mockup](/C:/Users/Qeema/.gemini/antigravity-ide/brain/b2929f95-5744-471a-8f49-a37022124d0e/shift_flow_mobile_mockups_1780587167533.png)

---

### Screen 1: Request Shift Start
The driver selects their vehicle and platform account, inputting their starting odometer reading and uploading required photos.

* **Trigger Actions**:
  - **Inputs**: `vehicleId`, `platformAccountId`, `startOdometer`, `notes` (optional).
  - **Media**: Upload starting photos (odometer, vehicle, platform app screenshot).
* **API Endpoint**: `POST` `/api/v1/shifts/request-start`
* **Response Status**: `201 Created`
* **Shift Status**: `REQUESTED`
* **Driver Status**: `AVAILABLE` / `OFF_DUTY` (bypasses active shift checks).

---

### Screen 2: Waiting for Approval
Displays a spinner or pending status message. Once the Supervisor/Admin approves the shift, the status switches to approved.

> [!NOTE]
> The mobile app should poll the current shift status using `GET /api/v1/auth/me` (or check `currentShift` object) to detect the transition from `REQUESTED` to `APPROVED`.

* **Admin Action**: `POST` `/api/v1/shifts/:id/approve` transitions shift to `APPROVED`.
* **State Detection**:
  - `GET /api/v1/auth/me` will return:
    ```json
    {
      "appUser": {
        "isOnShift": false,
        "currentShift": {
          "id": 123,
          "status": "APPROVED"
        }
      }
    }
    ```
* **UI Action**: Show a **"Launch Shift"** or **"Start Working"** button once `currentShift.status === 'APPROVED'`.

---

### Screen 3: Start Shift (Confirm Start)
The driver clicks the **"Launch Shift"** button to start their shift.

* **Trigger Action**: User clicks "Launch Shift".
* **API Endpoint**: `POST` `/api/v1/shifts/:id/start`
* **Response Status**: `200 OK`
* **Shift Status**: `ACTIVE`
* **Driver Status**: transitions to `ON_SHIFT` (updates `availabilityStatus` in DB).
* **UI Action**: Redirect to the **Active Shift Dashboard** (Screen 4).

---

### Screen 4: Active Shift Dashboard
Shows the timer, live tracking, and an "End Shift" option.

* **API Endpoints (Mid-shift)**:
  - Submit mid-shift photos: `POST` `/api/v1/mid-shift-records`
  - Log coordinates: `POST` `/api/v1/geofencing/locations`
