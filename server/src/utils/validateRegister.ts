import { UsernamePasswordInput } from "src/resolvers/UsernamePasswordInput";
import { UserResponse } from "src/resolvers/UserResponse";

export const validateRegister = (userData: UsernamePasswordInput): (UserResponse | null) => {
  if (userData.username.length <= 2) {
    return {
      errors: [
        {
          field: "username",
          messsage: "Length must be greater than 2",
        },
      ],
    };
  }

  if (userData.password.length <= 5) {
    return {
      errors: [
        {
          field: "password",
          messsage: "Length must be greater than 5",
        },
      ],
    };
  }

  if (!/^.*\@.*\..*$/.test(userData.email)) {
    return {
      errors: [
        {
          field: "email",
          messsage: "Please provide a valid email",
        },
      ],
    };
  }

  if (userData.username.includes("@")) {
    return {
      errors: [
        {
          field: "username",
          messsage: "username cannot contain an '@' sign",
        },
      ],
    };
  }



  return null;
};
