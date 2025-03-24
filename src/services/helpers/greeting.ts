import cfonts from "cfonts";

export const printGreeting = () => {
  cfonts.say("Book pulse", {
    font: "block",
    colors: ["green", "gray"],
    background: "transparent",
  });
};
