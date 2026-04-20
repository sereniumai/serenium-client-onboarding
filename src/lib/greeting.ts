export function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5)  return 'Up late';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Working late';
}
