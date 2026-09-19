import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users, Map, Calendar, Sparkles } from "lucide-react";

interface WelcomeModalProps {
  isAuthenticated: boolean;
}

export default function WelcomeModal({ isAuthenticated }: WelcomeModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Only show if the user is not authenticated and hasn't dismissed it in this session/local storage
    if (!isAuthenticated) {
      const hasDismissed = localStorage.getItem("nexo_welcome_dismissed");
      if (!hasDismissed) {
        setIsOpen(true);
      }
    }
  }, [isAuthenticated]);

  const handleDismiss = () => {
    localStorage.setItem("nexo_welcome_dismissed", "true");
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent showCloseButton={false} className="sm:max-w-md bg-gradient-to-br from-[#111e39] to-[#070e1d] border-[#75a1f1]/25 text-[#dcecff] shadow-[0_24px_80px_rgba(0,0,0,0.48),0_0_45px_rgba(87,202,255,0.08)] rounded-2xl" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <img
              src="/nexo-logo.png"
              alt="Nexo"
              className="w-16 h-16 rounded-2xl shadow-[0_0_24px_rgba(0,240,255,0.4),0_0_40px_rgba(94,23,235,0.3)] border border-[#00f0ff]/30 object-cover"
            />
          </div>
          <DialogTitle className="text-2xl text-center flex items-center justify-center gap-2 mb-1 tracking-tight font-bold">
            Bem-vindo ao <span className="brand-name" style={{ fontSize: "24px" }}>NEXO</span> <Sparkles className="text-[#00f0ff]" size={22} />
          </DialogTitle>
          <DialogDescription className="text-center text-[13px] text-[#7890b5]">
            Crie sua conta ou faça login para aproveitar todos os recursos:
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 my-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-[#75d2ff]/10 text-[#75d2ff] border border-[#75d2ff]/20">
              <Users size={20} />
            </div>
            <div>
              <h4 className="font-semibold text-[14px]">Jogue com amigos</h4>
              <p className="text-[12px] text-[#7890b5] mt-0.5">Compare resultados e veja quem é o mais rápido.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-[#75d2ff]/10 text-[#75d2ff] border border-[#75d2ff]/20">
              <Map size={20} />
            </div>
            <div>
              <h4 className="font-semibold text-[14px]">NexoMap</h4>
              <p className="text-[12px] text-[#7890b5] mt-0.5">Desbloqueie conquistas e construa seu mapa de evolução.</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-[#75d2ff]/10 text-[#75d2ff] border border-[#75d2ff]/20">
              <Calendar size={20} />
            </div>
            <div>
              <h4 className="font-semibold text-[14px]">Salve seu progresso</h4>
              <p className="text-[12px] text-[#7890b5] mt-0.5">Mantenha sua ofensiva (streak) e histórico de jogos.</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-3">
          <Link href="/cadastro" onClick={() => setIsOpen(false)}>
            <Button className="w-full text-[13px] font-bold h-11 bg-gradient-to-r from-[#ff9fad] to-[#ffc5cc] hover:opacity-90 text-[#300a12] border-0 rounded-lg">
              Criar Conta / Login
            </Button>
          </Link>
          <Button variant="ghost" className="w-full text-[#7890b5] hover:text-[#dcecff] hover:bg-[#75d2ff]/10 text-[12px]" onClick={handleDismiss}>
            Jogar sem login normalmente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
