import React, { useState } from "react";

const AddUserModal = ({ onClose, onUserAdded }) => {
  const [form, setForm] = useState({
    firstname: "",
    lastname: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    userType: "user",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "email") {
      // Only allow editing before the @
      const username = value.split("@")[0];
      setForm({ ...form, email: username + "@agilefacilities.com" });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  // Email validation function
  const validateEmail = (email) => {
    return email.toLowerCase().endsWith('@agilefacilities.com');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Email validation before submitting
    if (!validateEmail(form.email)) {
      setMessage({ type: "error", text: "Email must end with @agilefacilities.com" });
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "User added!" });
        setTimeout(() => {
          onUserAdded();
        }, 1000);
      } else {
        setMessage({ type: "error", text: data.message || "Failed to add user." });
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Network error." });
    }
    setLoading(false);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl"
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold mb-4 text-[#0a2342]">Add User</h2>
        {message && (
          <div
            className={`mb-4 text-center rounded-lg py-2 px-4 ${
              message.type === "success"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              name="firstname"
              placeholder="First Name"
              value={form.firstname}
              onChange={handleChange}
              className="w-1/2 px-3 py-2 border rounded"
              required
            />
            <input
              type="text"
              name="lastname"
              placeholder="Last Name"
              value={form.lastname}
              onChange={handleChange}
              className="w-1/2 px-3 py-2 border rounded"
              required
            />
          </div>
          <div className="relative">
            <input
              type="text"
              name="email"
              placeholder="Email"
              value={form.email.replace("@agilefacilities.com", "")}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded pr-44"
              required
              autoComplete="off"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 select-none pointer-events-none">
              @agilefacilities.com
            </span>
          </div>
          {/* Show validation message if email is not valid */}
          {form.email && !validateEmail(form.email) && (
            <p className="text-sm text-red-600 mb-2">Email must end with @agilefacilities.com</p>
          )}
          <input
            type="text"
            name="phone"
            placeholder="Phone"
            value={form.phone}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded"
            required
          />
          <div className="flex gap-2">
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              className="w-1/2 px-3 py-2 border rounded"
              required
            />
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={form.confirmPassword}
              onChange={handleChange}
              className="w-1/2 px-3 py-2 border rounded"
              required
            />
          </div>
          <select
            name="userType"
            value={form.userType}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded"
            required
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-[#19376d] text-white font-bold rounded-lg hover:bg-[#0a2342] transition"
          >
            {loading ? "Adding..." : "Add User"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddUserModal;