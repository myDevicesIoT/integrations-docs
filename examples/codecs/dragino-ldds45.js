//This is a version of the Dragino LDDS75 Distance Detection (Level) codec that uses a rolling average for the level.
//Sample data: 4b3a02000009000000
//Sample options for level/volume calculations
//Height: {"height": 1, "measurement": "HEIGHT", "orientation": "horizontal", "name": "rectangle"}
//Volume: {"measurement": "VOLUME", "orientation": "horizontal", "name": "cylinder", "eq": "PI * l * r^2", "eqp": "l * (r^2 * acos((r-x)/r) - (r-x)* sqrt(2*r*x - x^2) )", "capacity": 1.571, "equation_unit": "cm", "d": 1, "l": 2, "vol_unit": "m3", "prox_unit": "m"}

"use strict";

const READINGS = 30;
const SESSION_EXPIRES = 60 * 60 * 24 * 7;

let buffer = Decoder.data.buffer;
const options = Object.assign({}, Decoder.data.options);
let session = Decoder.data.session;
let sensors = [];
//LandCommand requested a 6 inch (15.24 cm) reset distance so that is the default unless a template overrides it.
let resetDistance = options.resetDistance ? options.resetDistance : 15.24; 

if (!session.levels) {
    session.levels = [];
}

//Newly added distance to container in all equations.
if (!options.dtc) {
    options.dtc = 0;
}

function getFixed(value, decimal = 2) {
  try {
    return Number(value.toFixed(decimal));
  } catch (error) {}
  return value;
}

function getAverage() {
    return session.levels.reduce((a, b) => a + b) / session.levels.length;
}

function evaluate(options) {
  try {
    const math = require("mathjs");
    const _ = require("lodash");
    const parser = math.parser();
    _.forEach(options, (v, k) => {
      parser.set(k, v);
    });
    let result = parser.eval(options.eqp);
    return result;
  } catch (e) {
    console.error(e);
  }
}

function computeVerticalLevel(options) {
  //we have x and we need to calculate the difference

  //if ht was not specified usually is the same as basis
  if (!options.ht) options.ht = options.hb;

  //for the rest of the cases the difference is embeded in equations
  options.hT =
    options.x - options.hb - options.hl > 0
      ? options.x - options.hb - options.hl
      : 0;
  options.hB = options.x - options.hb > 0 ? options.hb : options.x;
  options.hL =
    options.x - options.hb < 0
      ? 0
      : options.x - options.hb - options.hl > 0
      ? options.hl
      : options.x - options.hb;

  return options;
}

//set options.x when computing volume
function computeVolume(options) {
  let total = 0,
    partial = 0;
  //if there is a diameter compute radius from it
  if (options.d) {
    options.r = options.d / 2;
  }

  if (
    (options.orientation === "vertical" &&
      options.name.startsWith("cylinder")) ||
    options.name === "oval"
  ) {
    options.hl = options.h;
    if (options.name === "oval") {
      //do here some tricks on the variables to be able to compute as a vertical level complex equation
      if (options.orientation === "vertical") {
        options.a = options.h - options.w;
        options.r = options.w / 2;
        options.d = options.w;
        //now doing some workarounds for devices
        options.hb = options.ht = options.r;
        options.hl = options.a;
        options = computeVerticalLevel(options);
      } else {
        options.r = options.h / 2;
        options.a = options.w - options.h;
      }
    } else {
      options = computeVerticalLevel(options);
    }
  }
  partial = evaluate(options);
  if (typeof partial !== "number") {
    throw new Error("Invalid number");
  }
  return {
    total,
    partial,
  };
}

function sendLevel(distance) {
  let percent = null;
    if (options.dtc) {
        options.dtc *= 100;
        distance = Math.max(distance - options.dtc, 0);
    }
  
  if (options.measurement === "VOLUME") {
    //all other prox data from options is in meters
    //level comes in cm
    //in order to normalize data
    //we need to convert it to m
    options.x = distance / 100;
    var computedVolume = 0;
    try {
      const { total, partial } = computeVolume(options);
      percent = options.capacity
        ? (partial * 100) / options.capacity
        : null;
      computedVolume = partial;
    } catch (e) {
      //input data comes in meters so change height to cm
      console.error(e);
    }
    sensors.push({
      channel: 26,
      type: DataTypes.TYPE.VOLUME,
      unit: DataTypes.UNIT.CUBIC_METER,
      value: getFixed(computedVolume < 0 ? 0 : computedVolume, 3),
      name: "Volume",
    });
  } else {
    //input data comes in meters so change height to cm
    options.height = options.height ? options.height * 100 : null;
    percent = options.height
      ? ((options.height - distance) * 100) / options.height
      : null;
  }

    sensors.push({
    channel: 23,
    type: DataTypes.TYPE.PROXIMITY,
    unit: DataTypes.UNIT.CENTIMETER,
    value: getFixed(distance),
    name: "Distance",
  });
    if (options.height) {
    let level = options.height >= distance ? options.height - distance : 0;
        if (session.lastDistance < resetDistance && distance < resetDistance) {
            //Reset the level average to 100% if we get two readings in a row that are less than the reset difference.
            level = options.height;
            session.levels = [];
        }
        session.lastDistance = distance;
        session.levels.push(level);
        while(session.levels.length > READINGS) {
            session.levels.shift();
        }
        level = getAverage(session.levels);
      percent = level * 100 / options.height;
        
      sensors.push({
      channel: 24,
      type: DataTypes.TYPE.PROXIMITY,
      unit: DataTypes.UNIT.CENTIMETER,
      value: getFixed(level, 3),
      name: "Level",
    });
  }
    percent = Math.ceil(percent/10)*10;
  sensors.push({
    channel: 25,
    type: DataTypes.TYPE.PERCENTAGE,
    unit: DataTypes.UNIT.PERCENT,
    value: getFixed(percent < 0 ? 0 : percent),
    name: "Percentage",
  });
  sensors.push({
    channel: 500,
    type: DataTypes.TYPE.ANALOG_SENSOR,
    unit: DataTypes.UNIT.ANALOG,
    value: percent < 20 ? 0 : 1,
    name: "Refill Status",
  });    
}

let distance = buffer.readUInt16BE(2) / 10;
//If distance is 2cm it indicates an invalid reading so we drop it.
if (distance != 2) {
    //Use range from 2.5 volts to 2.8 volts to calculate battery percent
    let minValue = 2500;
    let range = 300;
    let battery = (buffer.readUInt16BE(0) & 0x3FFF) - minValue;
    let batteryPercent = Number((Math.min(Math.max(battery, 0), range) / range * 100).toFixed(2));
    sensors.push({
        channel: 5,
        type: DataTypes.TYPE.BATTERY,
        unit: DataTypes.UNIT.PERCENT,
        value: batteryPercent,
        name: 'Battery'
    });
    sendLevel(distance);
  Decoder.send(sensors);
}

Decoder.saveSession(session, SESSION_EXPIRES);
Decoder.done();