import db from ".";

/**
 * Get a user by their id
 * @param id - the id of the user
 * @returns the user
 */
export const getUserById = async (id: string) => {
  try {
    return await db.user.findUnique({
      where: {
        id,
      },
    });
  } catch (error) {
    console.error("Error fetching user by id", error);
    throw new Error("Error fetching user by id");
  }
};

/**
 * Get a deal POC by deal id
 * @param dealId - the id of the deal
 * @returns the deal POC
 */
export const getDealPOC = async (dealId: string) => {
  try {
    return await db.pOC.findMany({
      where: { dealId },
    });
  } catch (error) {
    console.error("Error fetching deal POC", error);
    throw new Error("Error fetching deal POC");
  }
};

/**
 * Get all screeners
 * @returns all screeners
 */
export async function getAllScreeners() {
  try {
    return await db.screener.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    console.error("Error fetching all screeners", error);
    return null;
  }
}

/**
 * Get all screeners
 * @returns all screeners
 */
export async function getAllScreenersWithContent() {
  try {
    return await db.screener.findMany({
      select: {
        id: true,
        name: true,
      },
    });
  } catch (error) {
    console.error("Error fetching all screeners", error);
    return null;
  }
}

/**
 * Get all deal reasonings with screener name
 * @param dealId - the id of the deal
 * @returns all deal reasonings with screener name
 */
export async function getAllDealReasoningsWithScreenerName(dealId: string) {
  try {
    return await db.aiScreening.findMany({
      where: {
        dealId,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        title: true,
        sentiment: true,
        score: true,
        explanation: true,
        createdAt: true,
        updatedAt: true,
        screener: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  } catch (error) {
    console.error(
      "Error fetching all deal reasonings with screener name",
      error
    );
    return null;
  }
}

/**
 * Get a complete ai reasoning by id
 * @param reasoningId - the id of the reasoning
 * @returns the complete ai reasoning
 */
export async function getCompleteAiReasoningById(reasoningId: string) {
  try {
    return await db.aiScreening.findUnique({
      where: {
        id: reasoningId,
      },
      select: {
        id: true,
        title: true,
        sentiment: true,
        score: true,
        content: true,
        explanation: true,
        createdAt: true,
        updatedAt: true,
        screener: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  } catch (error) {
    console.log(error);
    return null;
  }
}

/**
 * Get all rollups with their deals and users
 * @returns all rollups with relations
 */
export async function getAllRollups() {
  try {
    return await db.rollup.findMany({
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        deals: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  } catch (error) {
    console.error("Error fetching all rollups", error);
    return null;
  }
}

/**
 * Get a rollup by id with its deals and users
 * @param rollupId - the id of the rollup
 * @returns the rollup with relations
 */
export async function getRollupById(rollupId: string) {
  try {
    return await db.rollup.findUnique({
      where: {
        id: rollupId,
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        deals: true,
      },
    });
  } catch (error) {
    console.error("Error fetching rollup by id", error);
    return null;
  }
}

/**
 * Get a company by id
 * @param id - the id of the company
 * @returns the company
 */
export async function getCompanyById(id: string) {
  try {
    return await db.company.findUnique({
      where: { id },
      include: {
        founders: true,
        files: {
          orderBy: { createdAt: "desc" },
        },
        sections: {
          orderBy: { createdAt: "desc" },
        },
        reviews: {
          include: {
            reviewer: {
              select: { name: true, email: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        tasks: {
          include: {
            assignedTo: {
              select: { name: true, email: true },
            },
            createdBy: {
              select: { name: true, email: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: {
            files: true,
            sections: true,
            reviews: true,
            tasks: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("Error fetching company by id", error);
    return null;
  }
}
