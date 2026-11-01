import { identityService } from "../../../../server/identity";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = (request: Request) => identityService().handle(request);
export const POST = (request: Request) => identityService().handle(request);
