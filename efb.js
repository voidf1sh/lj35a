document.addEventListener("DOMContentLoaded", () => {
  let n1Data, f8ToData, f8DisData, vrData, v2Data;
  const zfwSlider = document.getElementById("zfw-slider");
  const zfwInput = document.getElementById("zfw");
  const fobSlider = document.getElementById("fob-slider");
  const fobInput = document.getElementById("fob");
  const gwInput = document.getElementById("gw");
  const calculateButton = document.querySelector("button[type='submit']");
  const gwWarning = document.getElementById("gw-warning");

  // Define the min and max values for sliders
  const minZFW = 10360;
  const maxZFW = 18300;
  const minFOB = 0;
  const maxFOB = 6240;
  const maxGW = 18300;
  const minGW = 0;

  // Function to load the JSON data
  async function loadData() {
    n1Data = await fetch("N1_flat.json").then((res) => res.json());
    f8ToData = await fetch("F8-TO_flat.json").then((res) => res.json());
    f8DisData = await fetch("F8-DIS_flat.json").then((res) => res.json());
    vrData = await fetch("VR_flat.json").then((res) => res.json());
    v2Data = await fetch("V2_flat.json").then((res) => res.json());
  }

  // Function to update the Gross Weight (GW) based on ZFW and FOB values
  const updateGW = () => {
    const zfw = parseFloat(zfwInput.value) || 0;
    const fob = parseFloat(fobInput.value) || 0;
    const gw = zfw + fob;

    if (gw > maxGW || gw < minGW) {
      gwInput.value = gw > maxGW ? `OUT OF LIMIT` : `Below min (${minGW})!`;
      calculateButton.disabled = true;
      gwWarning.style.display = "block";
      gwWarning.textContent = gw > maxGW
        ? `Gross Weight exceeds MTOW of ${maxGW} lbs!`
        : `Gross Weight is below the minimum limit of ${minGW} lbs!`;
    } else {
      gwInput.value = gw.toFixed(1);
      calculateButton.disabled = false;
      gwWarning.style.display = "none";
    }
  };

  // Set initial values for sliders and input fields
  const setInitialValues = () => {
    zfwSlider.value = minZFW;
    zfwInput.value = minZFW;
    fobSlider.value = minFOB;
    fobInput.value = minFOB;
    updateGW(); // Make sure the GW field is updated on load
  };

  // Sync ZFW slider and input
  zfwSlider.addEventListener("input", () => {
    zfwInput.value = zfwSlider.value;
    updateGW();
  });

  zfwInput.addEventListener("input", () => {
    const value = parseFloat(zfwInput.value);
    if (value >= minZFW && value <= maxZFW) {
      zfwSlider.value = zfwInput.value;
      updateGW();
    } else {
      zfwInput.value = zfwSlider.value; // Reset to slider value if out of range
    }
  });

  // Sync FOB slider and input
  fobSlider.addEventListener("input", () => {
    fobInput.value = fobSlider.value;
    updateGW();
  });

  fobInput.addEventListener("input", () => {
    const value = parseFloat(fobInput.value);
    if (value >= minFOB && value <= maxFOB) {
      fobSlider.value = fobInput.value;
      updateGW();
    } else {
      fobInput.value = fobSlider.value; // Reset to slider value if out of range
    }
  });

  // Initialize sliders and input values
  setInitialValues();

  // Trilinear Interpolation Logic (used for both V1 and takeoff distance)
  function trilinearInterpolation(data, targetOAT, targetElevation, targetGW) {
    // Sort data by OAT, elevation, and GW
    const sortedData = data.sort((a, b) => a.Elevation - b.Elevation || a.GW - b.GW || a.OAT - b.OAT);

    let lowerElevation = null, upperElevation = null;
    let lowerGW = null, upperGW = null;
    let lowerOAT = null, upperOAT = null;

    // Finding the bounds for elevation, GW, and OAT
    for (let i = 0; i < sortedData.length; i++) {
      const point = sortedData[i];
      if (point.Elevation <= targetElevation) lowerElevation = point.Elevation;
      if (point.Elevation >= targetElevation) upperElevation = point.Elevation;

      if (point.GW <= targetGW) lowerGW = point.GW;
      if (point.GW >= targetGW) upperGW = point.GW;

      if (point.OAT <= targetOAT) lowerOAT = point.OAT;
      if (point.OAT >= targetOAT) upperOAT = point.OAT;
    }

    // Now, interpolate for the exact value using trilinear interpolation
    const lowerData = data.filter(
      (item) => item.Elevation === lowerElevation && item.GW === lowerGW && item.OAT === lowerOAT
    );
    const upperData = data.filter(
      (item) => item.Elevation === upperElevation && item.GW === upperGW && item.OAT === upperOAT
    );

    const lowerValue = lowerData[0]?.V1 || lowerData[0]?.Distance;
    const upperValue = upperData[0]?.V1 || upperData[0]?.Distance;

    if (lowerValue !== undefined && upperValue !== undefined) {
      return lowerValue + (upperValue - lowerValue) * (targetElevation - lowerElevation);
    }

    return null; // Return null if unable to find values
  }

  calculateButton.addEventListener("click", (event) => {
    event.preventDefault();

    const oat = parseInt(document.getElementById("oat").textContent, 10);
    const gw = parseInt(gwInput.value, 10);

    // Get the elevation from the #elevation span (not input)
    const elevationText = document.getElementById("elevation").textContent;
    const elevation = parseInt(elevationText, 10); // Convert to number

    console.log("V1 Calculation Inputs:", { oat, elevation, gw });

    // Check if elevation is valid
    if (isNaN(elevation)) {
      console.error("Elevation is not valid:", elevation);
      return;
    }

    const v1 = trilinearInterpolation(f8ToData, oat, elevation, gw); // V1 Speed (uses F8-TO_flat.json)
    const distance = trilinearInterpolation(f8DisData, oat, elevation, gw); // Takeoff Distance (uses F8-DIS_flat.json)

    console.log("V1 Speed:", v1);
    console.log("Takeoff Distance:", distance);

    document.getElementById("v1-output").innerText = v1 ? `${Math.round(v1)} knots` : "N/A";
    document.getElementById("distance-output").innerText = distance ? `${Math.round(distance)} ft` : "N/A";
  });

  loadData();
});
