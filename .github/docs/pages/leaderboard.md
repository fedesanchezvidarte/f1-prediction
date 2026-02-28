# Leaderboard

In this page the user will be able to see the full list of users with their points and rank. We will also be able to provide two views:

- Simple view (default): Will show the leaderboard with users and their total points.
- Detailed view: Will show the leaderboard with users and their points on each race. And a column with the total points for the user.

## UI Specification

We will use the same color palette as the rest of the application.
We will have a very minimalistic design, there will be no space between the sections. So the sections will be stacked one on top of the other with a divider line between them.

We will have a navigation in the top to allow the user to switch between the two views. And provide a filter to select a specific race.

### Simple view

Will show the leaderboard with users and their total points. Similar to the leaderboard card in the home page.

### Detailed view

Will show the leaderboard with users and a column for each race. Similar to the predictions card in the home page, but we will have a column for each race, and the total points will be the sum of the points for each race. And a column with the total points for the user.

### Common features

Both views will have the same top navigation to switch between the two views.
Both views will have a filter to select a specific race.
Both view will have a footer with the pagination controls to navigate through the pages.

## Filters

We will be able to filter the leaderboard by each race. This allow the user to see the leaderboard for a specific race.

## Navigation

We will have the ability to navigate to a specific race prediction from each user, so users can see the previous predictions details and the results of the race.

This feature will be available only for the detailed view, and only for finished races, so the users cannot navigate to a race prediction of an ongoing or future race.

## Notes

We are going to implement the predictions details page in a later stage. So for now we are not going to redirect to it from the leaderboard page.
