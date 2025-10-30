import { auth } from "@/auth";
import { getUserById } from "./queries";
import { User } from "@prisma/client";

async function getUser(req: Request) {
  const sessionToken = await auth();
  if (!sessionToken) {
    return undefined;
  }

  try {
    const foundUser = await getUserById(sessionToken.user.id!);
    return foundUser;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

/**
 * Higher-order function to wrap API routes with authentication checks.
 * It verifies the user session and fetches user data before executing the route.
 *
 * @param handler - The API route function to wrap. It receives the authenticated User object as its second argument, followed by the original arguments.
 * @returns An asynchronous function that takes the original API route arguments, performs authentication, and then executes the handler. Returns the handler's result or an error object.
 */
export function withAuth(
  handler: (request: Request, user: User) => Promise<Response>,
) {
  return async (request: Request) => {
    // Note: Assuming getUser() can work without the request object
    // or the request object is needed by getUser internally.
    // If getUser doesn't need request, it can be called as getUser()
    const user = await getUser(request);
    if (!user) {
      return Response.json(
        { error: "Unauthorized" },
        {
          status: 401,
        },
      );
    }
    return handler(request, user);
  };
}

/**
 * Higher-order function to wrap Server Actions with authentication checks.
 * It verifies the user session and fetches user data before executing the action.
 *
 * @template TArgs - Tuple type representing the arguments of the server action.
 * @template TReturn - Return type of the server action.
 * @param handler - The server action function to wrap. It receives the authenticated User object as its first argument, followed by the original arguments.
 * @returns An asynchronous function that takes the original server action arguments, performs authentication, and then executes the handler. Returns the handler's result or an error object.
 */
export function withAuthServerAction<TArgs extends any[], TReturn>(
  // The handler takes User as the first arg, then the original action's args
  handler: (user: User, ...args: TArgs) => Promise<TReturn>,
) {
  // The returned function takes the original action's args
  return async (...args: TArgs): Promise<TReturn | { error: string }> => {
    // Fetch the user using the existing getUser logic (which uses auth())
    // No request object is passed here as server actions don't inherently have one
    const user = await getUser(undefined as any); // Pass undefined or adjust getUser if it doesn't need request
    if (!user) {
      // Return an error object, common pattern for server actions
      return { error: "Unauthorized" };
      // Alternatively, could throw: throw new Error("Unauthorized");
    }

    try {
      // Call the original handler with the authenticated user and the rest of the arguments
      return await handler(user, ...args);
    } catch (error) {
      // Catch errors from the handler execution
      console.error("Error in authenticated server action:", error);
      // Return an error object if the handler fails
      return {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred during the action",
      };
      // Alternatively, rethrow: throw error;
    }
  };
}
