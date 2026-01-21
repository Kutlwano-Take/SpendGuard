import { Amplify } from "aws-amplify";

const userPoolId =
  (import.meta.env.VITE_COGNITO_USER_POOL_ID as string | undefined) ??
  "af-south-1_8lY7dz2jx";
const userPoolClientId =
  (import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID as string | undefined) ??
  "5r4pn9uh18t68lcsu2hq3o786a";

if (userPoolId && userPoolClientId) {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        loginWith: {
          email: true,
        },
      },
    },
  });
} else {
  console.warn(
    "Amplify Auth not configured. Set VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_USER_POOL_CLIENT_ID."
  );
}
