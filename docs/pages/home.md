# Home Page

The home page will be the main page of the application and will be the first page that the user will see when he logs in.
It will have a clear dashboard as a bento grid with the following sections:

- Current user points and rank.
- Leaderboard of the season:
  - Link to the leaderboard page.
  - Will show the top 10 users only.
- Next race countdown.
  - If the race is live, there will be an "Live" state in that box and we will not show the countdown.
  - If the race is not started yet, we will show the "Upcoming" state in that box and we will show the countdown with the date, time and track name.
- Predictions:
  - Link to the predictions page.
  - Will show the predictions for the current race.
  - Will show the predictions for the next race.
  - Will show the predictions for the current race.
- Predictions point system:
  - Will display a modal with the point system of the predictions.
  - Will have a close button to close the modal.

## UI Specification

We will use the same color palette as the rest of the application.
We will have a very minimalistic design, there will be no space between the sections. So the sections will be stacked one on top of the other with a divider line between them.

We are going to use a bento grid, for reference we will have 3 columns per row, so we will have maximum 3 sections per row.

Mobile view:
[Current user points and rank]x2 [Next race countdown - Link to upcoming / live race page]
[Predictions - Link to the predictions page] [Leaderboard of the season - Link to the leaderboard page]x2
[Predictions point system] [] [] -> Add icons here until we implement more sections.
