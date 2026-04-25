import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import { Toaster } from "sonner";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import ProjectsList from "@/pages/ProjectsList";
import ProjectShell from "@/pages/ProjectShell";
import ProjectBoard from "@/pages/ProjectBoard";
import ProjectBacklog from "@/pages/ProjectBacklog";
import ProjectIssues from "@/pages/ProjectIssues";
import ProjectSettings from "@/pages/ProjectSettings";
import Team from "@/pages/Team";
import Search from "@/pages/Search";

function App() {
    return (
        <div className="App">
            <BrowserRouter>
                <AuthProvider>
                    <Toaster position="top-right" />
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />

                        <Route
                            path="/"
                            element={
                                <ProtectedRoute>
                                    <Layout>
                                        <Dashboard />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/projects"
                            element={
                                <ProtectedRoute>
                                    <Layout>
                                        <ProjectsList />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/projects/:id"
                            element={
                                <ProtectedRoute>
                                    <Layout>
                                        <ProjectShell />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        >
                            <Route index element={<Navigate to="board" replace />} />
                            <Route path="board" element={<ProjectBoard />} />
                            <Route path="backlog" element={<ProjectBacklog />} />
                            <Route path="issues" element={<ProjectIssues />} />
                            <Route path="settings" element={<ProjectSettings />} />
                        </Route>
                        <Route
                            path="/team"
                            element={
                                <ProtectedRoute>
                                    <Layout>
                                        <Team />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/search"
                            element={
                                <ProtectedRoute>
                                    <Layout>
                                        <Search />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </AuthProvider>
            </BrowserRouter>
        </div>
    );
}

export default App;
