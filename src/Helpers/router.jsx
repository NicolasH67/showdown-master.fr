import { createBrowserRouter } from "react-router-dom";

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <div>
        <h1>Home</h1>
      </div>
    ),
  },
  {
    path: "/history",
    element: (
      <div>
        <h1>History</h1>
      </div>
    ),
  },
  {
    path: "/createTournament",
    element: (
      <div>
        <h1>Create Tournament</h1>
      </div>
    ),
  },
  {
    path: "/contact",
    element: (
      <div>
        <h1>Contact</h1>
      </div>
    ),
  },
  {
    path: "/tournament/:id",
    children: [
      {
        path: "players",
        element: (
          <div>
            <h1>Tournament Players</h1>
          </div>
        ),
      },
      {
        path: "groups",
        element: (
          <div>
            <h1>Tournament Groups</h1>
          </div>
        ),
      },
      {
        path: "schedule",
        element: (
          <div>
            <h1>Tournament schedule</h1>
          </div>
        ),
      },
      {
        path: "admin",
        children: [
          {
            path: "players",
            element: (
              <div>
                <h1>Tournament admin player</h1>
              </div>
            ),
          },
          {
            path: "groups",
            element: (
              <div>
                <h1>Tournament admin groups</h1>
              </div>
            ),
          },
          {
            path: "schedule",
            element: (
              <div>
                <h1>Tournament admin schedule</h1>
              </div>
            ),
          },
          {
            path: "result",
            element: (
              <div>
                <h1>Tournament admin result</h1>
              </div>
            ),
          },
          {
            path: "tournamentEdit",
            element: (
              <div>
                <h1>Tournament edit</h1>
              </div>
            ),
          },
        ],
      },
    ],
  },
]);

export default router;
