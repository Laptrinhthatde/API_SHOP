const UserRouter = require("./UserRouter");
const AuthRouter = require("./AuthRouter");
const ProductRouter = require("./ProductRouter");
const OrderRouter = require("./OrderRouter");
const PaymentRouter = require("./PaymentRouter");
const ProductTypeRouter = require("./ProductTypeRouter");
const ReviewRouter = require("./ReviewRouter");
const RoleRouter = require("./RoleRouter");

const routes = (app) => {
  app.use("/api/auth", AuthRouter);
  app.use("/api/users", UserRouter);
  app.use("/api/products", ProductRouter);
  app.use("/api/product-types", ProductTypeRouter);
  app.use("/api/orders", OrderRouter);
  app.use("/api/payment", PaymentRouter);
  app.use("/api/reviews", ReviewRouter);
  app.use("/api/roles", RoleRouter);
};

module.exports = routes;