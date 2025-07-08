export const getGreeting = (userName?: string): string => {
  const hour = new Date().getHours();
  const name = userName ? `, ${userName}` : '';
  
  if (hour < 6) {
    return `Good night${name}`;
  } else if (hour < 12) {
    return `Good morning${name}`;
  } else if (hour < 17) {
    return `Good afternoon${name}`;
  } else if (hour < 21) {
    return `Good evening${name}`;
  } else {
    return `Good night${name}`;
  }
};

export const getMotivationalGreeting = (): string => {
  const hour = new Date().getHours();
  
  if (hour < 6) {
    return "Rest well, dream big";
  } else if (hour < 12) {
    return "Let's rewrite today together";
  } else if (hour < 17) {
    return "Your transformation continues";
  } else if (hour < 21) {
    return "Time to manifest your dreams";
  } else {
    return "Reflect and prepare for tomorrow";
  }
};

export const getInspirationalQuote = (): string => {
  const quotes = [
    "The only way to do great work is to love what you do. - Steve Jobs",
    "Your limitation—it's only your imagination.",
    "Push yourself, because no one else is going to do it for you.",
    "Great things never come from comfort zones.",
    "Dream it. Wish it. Do it.",
    "Success doesn't just find you. You have to go out and get it.",
    "The harder you work for something, the greater you'll feel when you achieve it.",
    "Dream bigger. Do bigger.",
    "Don't stop when you're tired. Stop when you're done.",
    "Wake up with determination. Go to bed with satisfaction.",
    "Do something today that your future self will thank you for.",
    "Little things make big days.",
    "It's going to be hard, but hard does not mean impossible.",
    "Don't wait for opportunity. Create it.",
    "Sometimes we're tested not to show our weaknesses, but to discover our strengths.",
  ];
  
  return quotes[Math.floor(Math.random() * quotes.length)];
};