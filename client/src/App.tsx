import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import NexoMap from "@/pages/NexoMap";
import ProfileSettings from "@/pages/ProfileSettings";
import Profile from "@/pages/Profile";
import Friends from "@/pages/Friends";
import Register from "@/pages/Register";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { VisualThemeProvider } from "./contexts/VisualThemeContext";
import Home from "./pages/Home";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/perfil/editar"} component={ProfileSettings} />
      <Route path={"/perfil"} component={Profile} />
      <Route path={"/nexomap"}><NexoMap /></Route>
      <Route path={"/nexomap/:id"}>{params => Number.isInteger(Number(params.id)) && Number(params.id) > 0 ? <NexoMap userId={Number(params.id)} /> : <NotFound />}</Route>
      <Route path={"/amigos"} component={Friends} />
      <Route path={"/cadastro"} component={Register} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <VisualThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </VisualThemeProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
