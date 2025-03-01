import { useState, useEffect } from "react";
import supabase from "../Helpers/supabaseClient";
import { useParams, useLocation } from "react-router-dom";

export const useAdminPassword = () => {
  const location = useLocation();
  const tournament = location.pathname.match(/\/tournament\/([^/]+)/);
  const id = tournament ? tournament[1] : null;
  const [adminPassword, setAdminPassword] = useState("");

  useEffect(() => {
    const fetchPassword = async () => {
      try {
        let { data, error } = await supabase
          .from("tournament")
          .select("admin_password")
          .eq("id", id);

        if (error) throw error;

        setAdminPassword(data);
      } catch (error) {
        console.log(error);
      }
    };

    fetchPassword();
  }, [id]);

  return adminPassword;
};
