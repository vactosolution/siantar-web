import { Tables } from "../../lib/database.types";

export type OperatingHours = {
  [key: string]: {
    isOpen: boolean;
    open: string;
    close: string;
  };
};

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/**
 * Checks if an outlet is currently open based on its schedule and timezone (WIB/UTC+7).
 * Handles edge cases like midnight-crossing shifts.
 */
export const isOutletCurrentlyOpen = (outlet: Tables<"outlets">, forcedDate?: Date): boolean => {
  // 1. Check if outlet is manually deactivated globally
  if (outlet.is_active === false) return false;

  // 2. Check if it's in manual schedule mode
  if (outlet.is_manual_schedule) {
    return outlet.is_open === true;
  }

  // 3. Automated schedule logic (WITA - Asia/Makassar)
  const now = forcedDate || new Date();
  
  // Format current time in WITA
  const witaTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Makassar",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).format(now);

  const [datePart, timePart] = witaTime.split(", ");
  let [hour, minute] = timePart.split(":").map(Number);
  if (hour === 24) hour = 0; // Fix edge case where hour12: false returns 24
  
  const currentTimeInMinutes = hour * 60 + minute;

  // Get current day name in WITA
  const currentDayName = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Makassar",
    weekday: "long",
  }).format(now).toLowerCase();

  const currentDayIndex = DAY_NAMES.indexOf(currentDayName);
  const yesterdayIndex = (currentDayIndex - 1 + 7) % 7;
  const yesterdayName = DAY_NAMES[yesterdayIndex];

  const operatingHours = outlet.operating_hours as any;
  if (!operatingHours) return false;

  const todaySchedule = operatingHours[currentDayName];
  const yesterdaySchedule = operatingHours[yesterdayName];

  let isOpenNow = false;

  // 1. Check if yesterday's shift is still ongoing (crossed midnight into today)
  if (yesterdaySchedule?.isOpen) {
    let [yOpenH, yOpenM] = yesterdaySchedule.open.split(":").map(Number);
    let [yCloseH, yCloseM] = yesterdaySchedule.close.split(":").map(Number);
    if (yOpenH === 24) yOpenH = 0;
    if (yCloseH === 24) yCloseH = 0;
    
    const yOpenTime = yOpenH * 60 + yOpenM;
    const yCloseTime = yCloseH * 60 + yCloseM;

    // If yesterday's close time is smaller than its open time, the shift crossed midnight.
    if (yCloseTime < yOpenTime) {
      // It is currently "today" morning, the shift extends from 00:00 to yCloseTime.
      if (currentTimeInMinutes < yCloseTime) {
        isOpenNow = true;
      }
    }
  }

  // 2. Check today's schedule
  if (!isOpenNow && todaySchedule?.isOpen) {
    let [tOpenH, tOpenM] = todaySchedule.open.split(":").map(Number);
    let [tCloseH, tCloseM] = todaySchedule.close.split(":").map(Number);
    if (tOpenH === 24) tOpenH = 0;
    if (tCloseH === 24) tCloseH = 0;

    const tOpenTime = tOpenH * 60 + tOpenM;
    const tCloseTime = tCloseH * 60 + tCloseM;

    if (tCloseTime < tOpenTime) {
      // Today's shift crosses midnight into tomorrow.
      // So today, it is open from tOpenTime to 23:59.
      if (currentTimeInMinutes >= tOpenTime) {
        isOpenNow = true;
      }
    } else {
      // Normal shift within the same day
      if (currentTimeInMinutes >= tOpenTime && currentTimeInMinutes < tCloseTime) {
        isOpenNow = true;
      }
    }
  }

  return isOpenNow;
};

/**
 * Gets the next opening time for display purposes.
 * Returns strings like "Buka pukul 09:00" or "Buka besok pukul 10:00".
 */
export const getNextOpenTime = (outlet: Tables<"outlets">): string => {
  if (outlet.is_manual_schedule) {
    return "Tutup sementara";
  }

  const now = new Date();
  const schedule = outlet.operating_hours as any;
  if (!schedule) return "Tutup permanen";

  // Format current time in WITA
  const witaTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Makassar",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).format(now);
  
  let [currentHourWITA, currentMinWITA] = witaTime.split(":").map(Number);
  if (currentHourWITA === 24) currentHourWITA = 0;
  const currentTimeInMinutes = currentHourWITA * 60 + currentMinWITA;

  // Get current day name in WITA
  const currentDayName = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Makassar",
    weekday: "long",
  }).format(now).toLowerCase();
  
  const currentDayIndex = DAY_NAMES.indexOf(currentDayName);

  // Check today's schedule first
  const todaySchedule = schedule[currentDayName];
  if (todaySchedule?.isOpen) {
    let [openH, openM] = todaySchedule.open.split(":").map(Number);
    if (openH === 24) openH = 0;
    const openTimeInMinutes = openH * 60 + openM;

    if (currentTimeInMinutes < openTimeInMinutes) {
      return `Buka pukul ${todaySchedule.open}`;
    }
  }

  // If not opening today (or already closed for today), find the next day it's open
  for (let i = 1; i <= 7; i++) {
    const nextDayIndex = (currentDayIndex + i) % 7;
    const nextDayName = DAY_NAMES[nextDayIndex];
    const nextDaySchedule = schedule[nextDayName];

    if (nextDaySchedule?.isOpen) {
      const dayLabel = i === 1 ? "besok" : nextDayName.charAt(0).toUpperCase() + nextDayName.slice(1);
      return `Buka ${dayLabel} pukul ${nextDaySchedule.open}`;
    }
  }

  return "Tutup permanen";
};
