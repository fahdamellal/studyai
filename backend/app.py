from flask import Flask
from flask_cors import CORS
from routes.analyze_routes import analyze_bp
from services.history_service import init_db


def create_app():
    app = Flask(__name__)
    app.config["JSON_AS_ASCII"] = False
    CORS(app)

    init_db()
    app.register_blueprint(analyze_bp)

    @app.get("/")
    def home():
        return {
            "message": "StudyAI backend OK",
            "endpoints": ["/health", "/upload", "/analyze", "/history"],
        }

    @app.get("/health")
    def health():
        return {"status": "ok", "service": "studyai-backend"}

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
