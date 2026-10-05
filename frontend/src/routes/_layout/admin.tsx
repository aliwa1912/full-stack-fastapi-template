import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

import { UsersService } from "@/client"

export const Route = createFileRoute("/_layout/admin")({
  component: AdminLayout,
  beforeLoad: async () => {
    const { data: user } = await UsersService.readUserMe()
    if (!user.is_superuser) {
      throw redirect({
        to: "/",
      })
    }
  },
  head: () => ({
    meta: [
      {
        title: "Admin - Aurelia Motorworks",
      },
    ],
  }),
})

function AdminLayout() {
  return <Outlet />
}
