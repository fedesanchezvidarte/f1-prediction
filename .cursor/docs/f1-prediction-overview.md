# F1 Prediction

This document describes the project and its requirements.

**Current Vercel project:** <https://f1-prediction.vercel.app/>

## Project Overview

This is a web application that allows users to predict the results of the next Formula 1 season.
Each user will be able to enter their predictions for each race of the season. At the end of the season, the user with the most correct predictions will be the winner. Also, there will other kind of predictions such as fastest lap, pole position, WDC, WDT, etc.

The predictions will be stored in a database and the results will be calculated based on the predictions and the actual results of the races.

There will be two types of users:

- Regular users: who can enter their predictions for each race of the season and view the predictions of other users.
- Administrators: who can manage the predictions and the users in case that we need to override the predictions of a user.

## Technologies

- Next.js (for the web application)
- Tailwind CSS (for the styling)
- TypeScript (for the programming language)
- OpenF1 API (for the data)
- Vercel (for the hosting)
- Supabase (for the database and storage)
- Supabase (for the authentication), so we need to setup the providers here, email and Google.

### Login and Registration

- The application will allow users to register and login.
- The application will allow users to login using Google.
- The application will allow users to connect their Google account to the application.

### Predictions

- The application will allow users to enter their predictions for each race of the season. This includes predictions for top 10 drivers of the race, fastest lap, pole position and fastest pit stop (to be determined), apply the same predictions for sprint races if they are held (only top 8 drivers).
- The application will allow users to change their predictions for each race of the season until the qualifying session of the race starts.
- The application will allow users to enter their predictions for the world drivers' championship and world constructors' championship.
- The application will allow users to edit their predictions for the world drivers' championship and world constructors' championship until the start of the first race of the season.
- The application will allow users to view the results of the predictions.
- The application will allow users to view the history of the predictions.
- The application will allow users to view the predictions of other users.

### Leaderboard

- The application will allow users to view the leaderboard of the season.
- The application will allow users to view the top 10 users of the season.
- The application will allow users to switch between the leaderboard of the season and the leaderboard of the current race.
- The application will allow users to change the view of the leaderboard to see a detailed view of the predictions of the users.

### Administration

- The application will allow administrators to manage the results of the races.
- The application will allow administrators to manage the users.
- The application will allow administrators to manage the predictions.

### Data Sources

- The application will use the OpenF1 API to get the data for the results,drivers, constructors, etc.

### Security

- The application will be secure and will use HTTPS.
- The application will use authentication and authorization to protect the data.
- The application will use a secure database to store the data.
- The application will use a secure API to get the data.

### User Interface

- The application will have a modern and responsive design.
- The application will have a clean and intuitive design.
- The application will have a minimalistic design.
- The application will have a dark and light mode.
- The application will have a mobile first design.
- The application will have a consistent design across all pages.

## UI Specification

### Login Page

- The login page will have a form to enter the email and password.
- The login page will have a button to login with Google.
- The login page will have a button to register. This will redirect to the registration page.
- The login page will have a link to the forgot password page.
- The login page will have the logo of the application in the top center.
- The login page will have a footer with the copyright and the year.

### Registration Page

- The registration page form will be equal to the login page form, but with the addition of a field to enter the name of the user.
- The registration page will have a button to register with Google.
- The registration page will have a button to go back to the login page.
- The registration page will have the logo of the application in the top center.
- The registration page will have a footer with the copyright and the year.

### Forgot Password Page

- The forgot password page will have a form to enter the email.
- The forgot password page will have a button to send the reset password email.
- The forgot password page will have a link to the login page.
- The forgot password page will have the logo of the application in the top center.
- The forgot password page will have a footer with the copyright and the year.

### Home Page

For now we will have an empty home page with the logo, name of the application and the logged user name.

We will add the content later.
