export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Subjects often start with a driver or team name ("Câmara in, Hirakawa out ...").
    "subject-case": [0],
  },
};
