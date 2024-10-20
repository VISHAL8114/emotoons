import os
import matplotlib.pyplot as plt
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import Conv2D, MaxPooling2D, Flatten, Dense, Dropout, BatchNormalization, Activation
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau, LearningRateScheduler
from tensorflow.keras.regularizers import l2
from sklearn.metrics import classification_report, confusion_matrix

# Define paths
base_path = "/home/vishal/Downloads/EmoTunes/data"  # Update this path to your data directory
train_path = os.path.join(base_path, "train")
val_path = os.path.join(base_path, "validation")

# Check if the paths exist
if not os.path.exists(train_path):
    raise FileNotFoundError(f"Training data path does not exist: {train_path}")

if not os.path.exists(val_path):
    raise FileNotFoundError(f"Validation data path does not exist: {val_path}")

# Define image data generators with augmentation for training
train_datagen = ImageDataGenerator(
    rescale=1./255,
    rotation_range=20,
    width_shift_range=0.2,
    height_shift_range=0.2,
    shear_range=0.2,
    zoom_range=0.2,
    horizontal_flip=True,
    fill_mode='nearest',
    brightness_range=[0.8,1.2],  # Added brightness adjustment
    channel_shift_range=50.0     # Added color channel shift
)

val_datagen = ImageDataGenerator(rescale=1./255)

# Load the data
train_set = train_datagen.flow_from_directory(
    train_path,
    target_size=(48, 48),
    batch_size=64,  # Adjusted batch size
    class_mode='categorical',
    color_mode='grayscale'
)

val_set = val_datagen.flow_from_directory(
    val_path,
    target_size=(48, 48),
    batch_size=64,  # Adjusted batch size
    class_mode='categorical',
    color_mode='grayscale'
)

# Define the model
model = Sequential([
    Conv2D(64, (3, 3), padding='same', input_shape=(48, 48, 1), kernel_regularizer=l2(0.001)),
    BatchNormalization(),
    Activation('relu'),
    MaxPooling2D((2, 2)),
    Dropout(0.25),

    Conv2D(128, (5, 5), padding='same', kernel_regularizer=l2(0.001)),
    BatchNormalization(),
    Activation('relu'),
    MaxPooling2D((2, 2)),
    Dropout(0.25),

    Conv2D(256, (3, 3), padding='same', kernel_regularizer=l2(0.001)),
    BatchNormalization(),
    Activation('relu'),
    MaxPooling2D((2, 2)),
    Dropout(0.25),

    Conv2D(256, (3, 3), padding='same', kernel_regularizer=l2(0.001)),
    BatchNormalization(),
    Activation('relu'),
    MaxPooling2D((2, 2)),
    Dropout(0.25),

    Flatten(),
    Dense(512, kernel_regularizer=l2(0.001)),
    BatchNormalization(),
    Activation('relu'),
    Dropout(0.5),
    Dense(512, kernel_regularizer=l2(0.001)),
    BatchNormalization(),
    Activation('relu'),
    Dropout(0.5),
    Dense(5, activation='softmax')  # Adjusted to 5 classes
])

# Compile the model
model.compile(
    optimizer=Adam(learning_rate=0.0001),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

# Define callbacks
checkpoint = ModelCheckpoint("models/emotion_model.keras", monitor='val_accuracy', verbose=1, save_best_only=True, mode='max')
early_stopping = EarlyStopping(monitor='val_loss', min_delta=0, patience=3, verbose=1, restore_best_weights=True)
reduce_learningrate = ReduceLROnPlateau(monitor='val_loss', factor=0.2, patience=3, verbose=1, min_delta=0.0001)


callbacks_list = [early_stopping, checkpoint, reduce_learningrate]

# Train the model
history = model.fit(
    train_set,
    epochs=25,
    validation_data=val_set,
    callbacks=callbacks_list
)

# Plot training & validation accuracy and loss values
plt.style.use('dark_background')
plt.figure(figsize=(20, 10))

# Plot training & validation loss values
plt.subplot(1, 2, 1)
plt.suptitle('Training and Validation Loss', fontsize=16)
plt.plot(history.history['loss'], label='Training Loss')
plt.plot(history.history['val_loss'], label='Validation Loss')
plt.ylabel('Loss')
plt.legend(loc='upper right')

# Plot training & validation accuracy values
plt.subplot(1, 2, 2)
plt.plot(history.history['accuracy'], label='Training Accuracy')
plt.plot(history.history['val_accuracy'], label='Validation Accuracy')
plt.ylabel('Accuracy')
plt.legend(loc='lower right')

plt.show()

# Save the final model
model_save_path = 'models/emotion_model.keras'
if not os.path.exists('models'):
    os.makedirs('models')

model.save(model_save_path)
print(f"Model saved to {model_save_path}")

# Load the saved model for evaluation
model = load_model(model_save_path)

# Evaluate the model on the validation data
loss, accuracy = model.evaluate(val_set, verbose=1)
print(f"Validation Loss: {loss:.4f}")
print(f"Validation Accuracy: {accuracy:.4f}")

# Optional: Print GPU info
print("Num GPUs Available: ", len(tf.config.list_physical_devices('GPU')))

# Generate and print confusion matrix and classification report
val_set_labels = val_set.classes
val_set_preds = np.argmax(model.predict(val_set), axis=1)

# Confusion matrix
cm = confusion_matrix(val_set_labels, val_set_preds)
print("Confusion Matrix:\n", cm)

# Classification report
report = classification_report(val_set_labels, val_set_preds)
print("Classification Report:\n", report)