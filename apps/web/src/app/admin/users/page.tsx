export default function AdminUsers() {
  return (
    <div>
      <h2 className="text-xl font-semibold">User management</h2>
      <p className="mt-2 text-sm text-slate-600">No users are listed yet. User rows live in the database (User table) once a live database is connected; this build has no live database, so no user list is invented here. An admin can change a user role, and every change is logged with time, actor, and action. Admin access to a user pack needs a recorded support reason.</p>
      <p className="mt-2 text-sm text-slate-600">Seed account for local development only: seller@example.com, role Seller, plan Free. It is not a real account.</p>
    </div>
  );
}
