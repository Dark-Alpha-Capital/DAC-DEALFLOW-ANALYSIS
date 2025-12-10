"use server";

/**
 * Simulated server action to create a ticket.
 * @param formData FormData from the new ticket form
 * @returns A success/failure response with a placeholder ticket ID
 */
export async function createTicketServerAction(formData: FormData) {
  try {
    // Log form values for debugging
    console.log(
      "Simulating ticket creation...",
      Object.fromEntries(formData.entries())
    );

    // Simulate network/database delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Generate a random placeholder ID for the new ticket
    const ticketId = Math.floor(Math.random() * 100000).toString();

    return {
      success: true,
      message: "Ticket created successfully",
      ticketId,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to create ticket",
    };
  }
}
