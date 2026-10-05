import { useQuery } from "@tanstack/react-query"
import {
  CarFront,
  ExternalLink,
  Globe,
  Inbox,
  LayoutDashboard,
  Users,
} from "lucide-react"

import { AdminService } from "@/client"
import { SidebarAppearance } from "@/components/Common/Appearance"
import { Logo } from "@/components/Common/Logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import useAuth from "@/hooks/useAuth"
import { type Group, Main } from "./Main"
import { User } from "./User"

const personalItems = [
  { icon: LayoutDashboard, title: "Dashboard", path: "/dashboard" },
  { icon: CarFront, title: "My Vehicles", path: "/dashboard/vehicles" },
]

export function AppSidebar() {
  const { user: currentUser } = useAuth()
  const isAdmin = Boolean(currentUser?.is_superuser)

  // Only admins fetch the counters, and the lead count feeds the nav badge.
  const { data: stats } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => (await AdminService.readAdminStats()).data,
    enabled: isAdmin,
  })

  const groups: Group[] = isAdmin
    ? [
        {
          title: "Overview",
          items: [
            { icon: LayoutDashboard, title: "Dashboard", path: "/admin" },
          ],
        },
        {
          title: "Content",
          items: [
            { icon: CarFront, title: "Inventory", path: "/admin/inventory" },
            { icon: Globe, title: "Site & Branding", path: "/admin/site" },
          ],
        },
        {
          title: "People",
          items: [
            {
              icon: Inbox,
              title: "Inquiries",
              path: "/admin/inquiries",
              badge: stats?.new_inquiries ?? 0,
            },
            { icon: Users, title: "Users", path: "/admin/users" },
          ],
        },
        { title: "Personal", items: personalItems },
      ]
    : [{ title: "Personal", items: personalItems }]

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-6 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center">
        <Logo variant="responsive" />
      </SidebarHeader>
      <SidebarContent>
        <Main groups={groups} />
      </SidebarContent>
      <SidebarFooter>
        {isAdmin && (
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground group-data-[collapsible=icon]:hidden"
          >
            <ExternalLink className="size-3.5" />
            View public site
          </a>
        )}
        <SidebarAppearance />
        <User user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  )
}

export default AppSidebar
