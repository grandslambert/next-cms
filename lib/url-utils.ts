import { connectDB } from '@/lib/db';
import { Site } from '@/lib/models';

export async function getSiteByDomain(domain: string) {
  try {
    await connectDB();

    const site = await Site.findOne({
      $or: [
        { domain },
        { domain: domain.replace(/^www\./, '') },
      ],
    }).lean();

    if (!site) {
      return null;
    }

    return {
      ...site,
      id: site._id.toString(),
    };
  } catch (error) {
    console.error('Error fetching site by domain:', error);
    return null;
  }
}

export async function getDefaultSite() {
  try {
    await connectDB();

    const site = await Site.findOne().sort({ created_at: 1 }).lean();

    if (!site) {
      return null;
    }

    return {
      ...site,
      id: site._id.toString(),
    };
  } catch (error) {
    console.error('Error fetching default site:', error);
    return null;
  }
}
