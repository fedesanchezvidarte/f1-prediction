# Race Prediction

In this page the user will be able to see and manage its predictions.

## UI Specification

We will use the same color palette as the rest of the application.
We will have a very minimalistic design, there will be no space between the sections. So the sections will be stacked one on top of the other with a divider line between them.

We will have a navigation in the top to allow the user to switch between the different races and the champion predictions. And to switch between Race and Sprint race predictions (disabled if the race does not have a sprint race).

This page will be available for all users. Only the predictions of the current user will be available to edit. And the user will be able to see the predictions of other users by clicking on the user name in the predictions card in the home page, or in the leaderboard page in the detailed view.

We will also display some information about the race like the date, track name, if it is currently live, if it is completed, etc. Also saving some space to display the race results when the race is completed. This last thing could be a button to toggle the display of the race results or a modal with the race results. And another information for other users predictions to see who predicted what.

### Race predictions form

Will display the form to enter the predictions for the race.
Each input will be a dropdown with the drivers names.

#### Race predictions inputs

- Pole position
- Race winner
- Top 10 drivers (except for the race winner)
- Fastest lap
- Fastest pit stop

#### Sprint race predictions inputs (if the race has a sprint race)

- Sprint pole position
- Sprint race winner
- Top 8 drivers (except for the sprint race winner)
- Fastest lap

#### Race prediction notes

- We will not allow the user to predict the fastest pit stop for the sprint race.
- We will not allow the user to predict the same driver for multiple final positions within the same race, same applies for the sprint race.

### Champion predictions form

Will display the form to enter the predictions for the champion.

Each input will be a dropdown with the drivers names.

- WDC winner
- WCC winner

This form will be available only before the start of the first race of the season.
We will reopen this form after the summer break, but with the warning that the predictions will lost half of its points.

#### Champion predictions notes

- We will display a tooltip with the information about that this predictions are not editable after the start of the first race of the season. And the predictions will be lost half of its points if the user changes them after the summer break.

### Common features

- We will have a button to submit the predictions that change its color depending on the state of the predictions:
  - If the predictions are not submitted yet, the button will be green.
  - If the predictions are submitted but not scored yet, the button will be blue.
  - If the predictions are scored, the button will be disabled.
  - If the user is editing the predictions, the button will be yellow
- We will have a box to display the point earned on the current race selected.
- We will have a button to reset the predictions to the default values. This will be displayed for each race and each user.
